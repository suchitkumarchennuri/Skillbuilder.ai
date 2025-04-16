/**
 * LinkedIn Profile Analysis Module
 *
 * This is the consolidated and definitive implementation of the LinkedIn profile analysis functionality.
 * It combines the best features from previous versions and provides a complete solution for
 * fetching, analyzing, and formatting LinkedIn profile data.
 *
 * Key features:
 * - Profile data fetching with RapidAPI
 * - AI-powered analysis with OpenRouter/GPT
 * - Experience, projects, and metrics focused analysis
 * - Caching for performance
 * - Error handling and retries
 * - Database-friendly formatting
 */

import { z } from "zod";
import axios from "axios";
import type { ProfileSuggestion } from "../types";

// Constants for API calls
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || "";
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
const MODEL = "gpt-3.5-turbo-0125"; // Use the latest 0125 version which is faster
const API_TIMEOUT = 30000; // 30 seconds to allow enough time for fetching
const MAX_RETRIES = 2; // Number of retry attempts for API calls
const CACHE_TTL = 1000 * 60 * 60 * 24 * 14; // 14 days cache

// Add configuration check helper
export const isLinkedInAnalysisConfigured = (): boolean => {
  return Boolean(RAPIDAPI_KEY) && Boolean(OPENROUTER_API_KEY);
};

// LinkedIn skill schema
const skillSchema = z.union([
  z.string(),
  z.object({
    name: z.string(),
  }),
]);

// Language schema (similar to skill schema)
const languageSchema = z.union([
  z.string(),
  z.object({
    name: z.string(),
  }),
]);

// LinkedIn profile schema
const linkedinProfileSchema = z
  .object({
    data: z
      .object({
        profile_id: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        full_name: z.string().optional(),
        headline: z.string().optional(),
        location: z.string().optional(),
        summary: z.string().optional(),
        occupation: z.string().optional(),
        image_url: z.string().url().optional(),
        follower_count: z.number().optional(),
        connection_count: z.number().optional(),
        background_cover_image_url: z.string().url().optional(),
        experiences: z
          .array(
            z.object({
              company: z.string(),
              title: z.string(),
              description: z.string().optional(),
              location: z.string().optional(),
              starts_at: z
                .object({
                  day: z.number().optional(),
                  month: z.number().optional(),
                  year: z.number(),
                })
                .optional(),
              ends_at: z
                .object({
                  day: z.number().optional(),
                  month: z.number().optional(),
                  year: z.number(),
                })
                .optional(),
              company_linkedin_profile_url: z.string().url().optional(),
            })
          )
          .optional(),
        education: z
          .array(
            z.object({
              school: z.string(),
              degree_name: z.string().optional(),
              field_of_study: z.string().optional(),
              starts_at: z
                .object({
                  day: z.number().optional(),
                  month: z.number().optional(),
                  year: z.number().optional(),
                })
                .optional(),
              ends_at: z
                .object({
                  day: z.number().optional(),
                  month: z.number().optional(),
                  year: z.number().optional(),
                })
                .optional(),
              school_linkedin_profile_url: z.string().url().optional(),
            })
          )
          .optional(),
        languages: z.array(languageSchema).optional(),
        skills: z.array(skillSchema).optional(),
        certifications: z
          .array(
            z.object({
              name: z.string(),
              authority: z.string().optional(),
              starts_at: z
                .object({
                  day: z.number().optional(),
                  month: z.number().optional(),
                  year: z.number().optional(),
                })
                .optional(),
              ends_at: z
                .object({
                  day: z.number().optional(),
                  month: z.number().optional(),
                  year: z.number().optional(),
                })
                .optional(),
            })
          )
          .optional(),
      })
      .optional()
      .default({}),
  })
  .transform((data) => data.data);

// OpenRouter API response schema
const openRouterResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    })
  ),
});

interface LinkedInAnalysisResult {
  score: number;
  suggestions: ProfileSuggestion[];
  strengths: string[];
  weaknesses: string[];
}

// Cache management
const cache = new Map<string, { data: any; timestamp: number }>();

function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

function extractProfileUrl(url: string): string {
  const urlPattern = /linkedin\.com\/in\/([^\/\?#]+)/i;
  const match = url.match(urlPattern);
  if (!match) {
    throw new Error(
      "Invalid LinkedIn profile URL format. Please provide a valid profile URL (e.g., https://www.linkedin.com/in/username)"
    );
  }
  return url;
}

// Add a debug flag to help identify issues
const DEBUG = false;

// Log function
function log(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[LinkedIn Analysis] ${message}`, data || "");
  }
}

// Simplified prompt generation function to reduce unnecessary data
function generateAnalysisPrompt(
  profile: z.infer<typeof linkedinProfileSchema>
): string {
  const sections: string[] = [];

  // Include profile information with headline
  if (profile.full_name || profile.headline) {
    sections.push(
      `Profile: ${[profile.full_name, profile.headline]
        .filter(Boolean)
        .join(" | ")}`
    );
  }

  // Include summary
  if (profile.summary) {
    sections.push(
      `Summary: ${profile.summary.substring(0, 200)}${
        profile.summary.length > 200 ? "..." : ""
      }`
    );
  }

  // Include experiences with more details
  if (profile.experiences?.length) {
    const formattedExperiences = profile.experiences
      .map((exp, index) => {
        const duration = exp.starts_at
          ? `${exp.starts_at.year}${
              exp.ends_at ? ` to ${exp.ends_at.year}` : " to Present"
            }`
          : "";

        // Include full description to capture projects and achievements
        const description = exp.description
          ? `\n   Description: ${exp.description}`
          : "";

        return `- Experience ${index + 1}: ${exp.title} at ${
          exp.company
        } ${duration}${description}`;
      })
      .join("\n\n");

    sections.push(
      "EXPERIENCE SECTION (including projects and achievements):\n" +
        formattedExperiences
    );
  }

  return sections.join("\n\n") || "No profile data available";
}

// More aggressive browser-based localStorage caching
async function fetchProfileData(
  profileUrl: string,
  retries = MAX_RETRIES
): Promise<any> {
  if (!isLinkedInAnalysisConfigured()) {
    throw new Error("LinkedIn analysis service is not properly configured");
  }

  const cacheKey = `profile:${profileUrl}`;

  // First check memory cache with higher priority
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    log("Using profile from memory cache");
    return cached.data;
  }

  // Then check localStorage cache
  try {
    const storageKey = `linkedin_profile_${btoa(profileUrl)}`;
    const storedData = localStorage.getItem(storageKey);
    if (storedData) {
      try {
        const { data, timestamp } = JSON.parse(storedData);
        if (Date.now() - timestamp < CACHE_TTL) {
          // Store in memory cache too
          log("Using profile from localStorage cache");
          cache.set(cacheKey, { data, timestamp });
          return data;
        }
      } catch (parseError) {
        // If parsing fails, remove the invalid cache entry
        localStorage.removeItem(storageKey);
      }
    }
  } catch (e) {
    log("Unable to access localStorage for caching", e);
  }

  log(
    `Fetching profile data (attempt ${MAX_RETRIES - retries + 1}/${
      MAX_RETRIES + 1
    })...`
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    // Use a more efficient way to fetch data
    const response = await axios({
      method: "get",
      url: "https://linkedin-api8.p.rapidapi.com/get-profile-data-by-url",
      params: {
        url: profileUrl,
      },
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "linkedin-api8.p.rapidapi.com",
      },
      signal: controller.signal,
      timeout: API_TIMEOUT,
    });

    log("LinkedIn API request completed");

    // Process API response data
    try {
      // Validate that we received some data
      if (!response.data) {
        throw new Error("LinkedIn API returned empty data");
      }

      const responseData = response.data;

      // Try to use the profile schema for safer data extraction
      try {
        // First try using the schema parser for validation
        const validatedData = linkedinProfileSchema.safeParse({
          data: responseData,
        });

        if (validatedData.success) {
          log("Successfully validated profile data with schema");

          // Cache the validated data
          const timestamp = Date.now();
          cache.set(cacheKey, { data: validatedData.data, timestamp });

          try {
            const storageKey = `linkedin_profile_${btoa(profileUrl)}`;
            localStorage.setItem(
              storageKey,
              JSON.stringify({ data: validatedData.data, timestamp })
            );
          } catch (e) {
            log("Unable to save to localStorage", e);
          }

          return validatedData.data;
        }

        // If validation failed, log the error and continue with manual extraction
        log("Schema validation failed, falling back to manual extraction");
      } catch (schemaError) {
        log(
          "Schema validation error, falling back to manual extraction",
          schemaError
        );
      }

      // Check if we have the minimum required fields
      if (
        !responseData.full_name &&
        !responseData.headline &&
        !responseData.experiences
      ) {
        log("LinkedIn API response is missing essential data");

        // If we have retries left, try again
        if (retries > 0) {
          log(
            `Incomplete data received, retrying (${retries} attempts left)...`
          );
          // Wait a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return fetchProfileData(profileUrl, retries - 1);
        }

        // If we're out of retries, use what we have but warn about it
        log("Out of retries, proceeding with incomplete data");
      }

      // Extract only the essential fields with safer access
      const extractedData = {
        full_name: responseData?.full_name || "",
        headline: responseData?.headline || "",
        summary: responseData?.summary || "",
        experiences: Array.isArray(responseData?.experiences)
          ? responseData.experiences.map((exp: any) => ({
              company: typeof exp?.company === "string" ? exp.company : "",
              title: typeof exp?.title === "string" ? exp.title : "",
              description:
                typeof exp?.description === "string" ? exp.description : "",
              starts_at:
                exp?.starts_at && typeof exp.starts_at === "object"
                  ? {
                      year:
                        typeof exp.starts_at.year === "number"
                          ? exp.starts_at.year
                          : 0,
                      month:
                        typeof exp.starts_at.month === "number"
                          ? exp.starts_at.month
                          : 0,
                      day:
                        typeof exp.starts_at.day === "number"
                          ? exp.starts_at.day
                          : 0,
                    }
                  : null,
              ends_at:
                exp?.ends_at && typeof exp.ends_at === "object"
                  ? {
                      year:
                        typeof exp.ends_at.year === "number"
                          ? exp.ends_at.year
                          : 0,
                      month:
                        typeof exp.ends_at.month === "number"
                          ? exp.ends_at.month
                          : 0,
                      day:
                        typeof exp.ends_at.day === "number"
                          ? exp.ends_at.day
                          : 0,
                    }
                  : null,
            }))
          : [],
      };

      // If we have no experiences but still have retries, try again
      if (extractedData.experiences.length === 0 && retries > 0) {
        log(`No experiences found, retrying (${retries} attempts left)...`);
        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return fetchProfileData(profileUrl, retries - 1);
      }

      const timestamp = Date.now();

      // Cache successful response in memory
      cache.set(cacheKey, { data: extractedData, timestamp });

      // Also cache in localStorage with error handling
      try {
        const storageKey = `linkedin_profile_${btoa(profileUrl)}`;
        localStorage.setItem(
          storageKey,
          JSON.stringify({ data: extractedData, timestamp })
        );
      } catch (e) {
        log("Unable to save to localStorage", e);
      }

      return extractedData;
    } catch (validationError) {
      log("Error extracting LinkedIn profile data:", validationError);

      // If we have retries left, try again
      if (retries > 0) {
        log(`Error in data extraction, retrying (${retries} attempts left)...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return fetchProfileData(profileUrl, retries - 1);
      }

      throw new Error(
        "Error processing LinkedIn profile data after multiple attempts"
      );
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        log("Request timed out");

        // If we have retries left, try again with a longer timeout
        if (retries > 0) {
          log(`Request timed out, retrying (${retries} attempts left)...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return fetchProfileData(profileUrl, retries - 1);
        }

        throw new Error(
          "LinkedIn profile data fetch timed out after multiple attempts"
        );
      }

      if (error.response?.status === 429 && retries > 0) {
        log("Rate limited, waiting and retrying...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return fetchProfileData(profileUrl, retries - 1);
      }

      if (error.response?.status === 404) {
        throw new Error(
          "LinkedIn profile not found. Please check the URL and try again."
        );
      }

      throw new Error(
        `Failed to fetch profile data: ${
          error.response?.data?.message || error.message
        }`
      );
    }

    if (error instanceof z.ZodError) {
      log("Validation error:", error.errors);
      throw new Error(
        "Invalid response format from LinkedIn API. Please try again later."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Simplify the parsing function to improve performance
function parseAIResponse(content: string): LinkedInAnalysisResult {
  // Extract score more efficiently with direct pattern match
  const scoreMatch = content.match(/(?:score|rating):\s*(\d+)/i);
  const score = scoreMatch
    ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)))
    : 50;

  // Initialize arrays
  const suggestions: ProfileSuggestion[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Use a more efficient approach to extract sections
  const strengthsMatch = content.match(
    /strengths?:?\s*(.+?)(?=weaknesses?:|\n\n|$)/is
  );
  const weaknessesMatch = content.match(
    /weaknesses?:?\s*(.+?)(?=suggestions?:|\n\n|$)/is
  );
  const suggestionsMatch = content.match(/suggestions?:?\s*(.+?)(?=\n\n|$)/is);

  // Extract strengths
  if (strengthsMatch && strengthsMatch[1]) {
    const strengthItems = strengthsMatch[1]
      .split(/\n/)
      .filter((line) => line.trim().length > 5 && /^[-•*]/.test(line.trim()));

    for (const item of strengthItems) {
      strengths.push(item.replace(/^[-•*]\s*/, "").trim());
    }
  }

  // Extract weaknesses
  if (weaknessesMatch && weaknessesMatch[1]) {
    const weaknessItems = weaknessesMatch[1]
      .split(/\n/)
      .filter((line) => line.trim().length > 5 && /^[-•*]/.test(line.trim()));

    for (const item of weaknessItems) {
      weaknesses.push(item.replace(/^[-•*]\s*/, "").trim());
    }
  }

  // Extract suggestions
  if (suggestionsMatch && suggestionsMatch[1]) {
    const suggestionItems = suggestionsMatch[1]
      .split(/\n/)
      .filter((line) => line.trim().length > 5 && /^[-•*]/.test(line.trim()));

    for (const item of suggestionItems) {
      const cleanLine = item.replace(/^[-•*]\s*/, "").trim();
      if (cleanLine.length > 5) {
        // Determine section and priority more efficiently
        const section =
          /experience|work|position|role|job|title|company|career|project|achievement|accomplishment|result|impact|metric|quantify|measure|industry|domain/i.test(
            cleanLine
          )
            ? "experience"
            : /network|connection|engagement|endorsement/i.test(cleanLine)
            ? "network"
            : "profile";

        // Set high priority for suggestions related to projects, achievements, and metrics
        const priority =
          /project|achievement|accomplishment|result|impact|metric|quantify|measure|critical|crucial|essential|urgent|important|must|should|need to/i.test(
            cleanLine
          )
            ? "high"
            : /consider|might|could|optional|maybe/i.test(cleanLine)
            ? "low"
            : "medium";

        suggestions.push({ section, suggestion: cleanLine, priority });
      }
    }
  }

  // Ensure we have at least minimal defaults
  return {
    score,
    suggestions:
      suggestions.length > 0
        ? suggestions
        : [
            {
              section: "experience",
              suggestion:
                "Include specific projects or achievements in each role to showcase impact and results.",
              priority: "high",
            },
            {
              section: "experience",
              suggestion:
                "Quantify accomplishments with metrics or data to demonstrate the effectiveness of your work.",
              priority: "high",
            },
            {
              section: "experience",
              suggestion:
                "Provide more context on the industries or domains where you have applied your skills to give a clearer picture of your experience.",
              priority: "medium",
            },
          ],
    strengths:
      strengths.length > 0 ? strengths : ["No specific strengths identified"],
    weaknesses:
      weaknesses.length > 0
        ? weaknesses
        : [
            "Profile needs more detailed information about specific projects and achievements",
          ],
  };
}

// Simplified AI analysis function with retry capabilities
async function analyzeWithAI(
  prompt: string,
  signal?: AbortSignal,
  retries = 1
): Promise<LinkedInAnalysisResult> {
  if (!isLinkedInAnalysisConfigured()) {
    throw new Error("LinkedIn analysis service is not properly configured");
  }

  log(`Starting AI analysis (attempt ${2 - retries})...`);
  log("Prompt length:", prompt.length);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": window.location.origin,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are a LinkedIn profile analyzer with special focus on work experience details. Pay SPECIAL ATTENTION to the EXPERIENCE SECTION in the profile data including any projects, achievements, and metrics mentioned. Look for specific accomplishments, quantifiable results, and project details within job descriptions. Make sure to analyze all job titles, companies, roles, and specific achievements/metrics provided in the experience descriptions. Provide a concise analysis with: 1) Score (0-100), 2) 3 strengths based on the experience and achievements, 3) 3 weaknesses in the profile highlighting missing metrics or project details, 4) 3 improvement suggestions that should include adding specific projects, quantifying accomplishments with metrics, and providing more context on industries/domains. Format as: 'Score: X\n\nStrengths:\n• S1\n• S2\n• S3\n\nWeaknesses:\n• W1\n• W2\n• W3\n\nSuggestions:\n• Sg1\n• Sg2\n• Sg3'",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 500, // Reduced token limit for faster response
          temperature: 0.1, // Lower temperature for faster, more predictable responses
        }),
        signal: signal || controller.signal,
      }
    );

    log("AI API request completed");

    if (!response.ok) {
      const errorText = await response.text();
      log("AI API error:", errorText);

      if (retries > 0 && (response.status === 429 || response.status >= 500)) {
        log(`API error (status ${response.status}), retrying...`);
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return analyzeWithAI(prompt, signal, retries - 1);
      }

      throw new Error(`AI API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    log("AI response parsed");

    const validated = openRouterResponseSchema.parse(data);
    const result = parseAIResponse(validated.choices[0].message.content);

    // Validate that we have a meaningful response
    if (
      result.strengths.length === 0 ||
      result.weaknesses.length === 0 ||
      result.suggestions.length === 0
    ) {
      log("AI response is missing key sections");

      if (retries > 0) {
        log("Incomplete AI analysis, retrying...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return analyzeWithAI(prompt, signal, retries - 1);
      }
    }

    // Check if we have meaningful experience-related suggestions
    const hasExperienceSuggestions = result.suggestions.some(
      (suggestion) =>
        suggestion.section === "experience" &&
        /project|achievement|accomplishment|result|impact|metric|quantify|measure|industry|domain/i.test(
          suggestion.suggestion
        )
    );

    if (!hasExperienceSuggestions && retries > 0) {
      log(
        "No specific project or achievement related suggestions found, retrying analysis..."
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return analyzeWithAI(prompt, signal, retries - 1);
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError" || signal?.aborted) {
        throw new Error("Analysis cancelled");
      }

      if (retries > 0) {
        log(`AI analysis error, retrying: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return analyzeWithAI(prompt, signal, retries - 1);
      }

      throw new Error(`AI analysis failed: ${error.message}`);
    }
    throw new Error("An unexpected error occurred during analysis");
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function analyzeLinkedInProfile(
  profileUrl: string,
  signal?: AbortSignal
): Promise<LinkedInAnalysisResult> {
  log("Starting LinkedIn profile analysis process for:", profileUrl);

  try {
    if (!isLinkedInAnalysisConfigured()) {
      log("LinkedIn analysis not configured");
      throw new Error(
        "LinkedIn analysis service is not properly configured. Please check your environment variables."
      );
    }

    // Clean cache periodically
    clearExpiredCache();

    // Validate and clean profile URL
    const cleanProfileUrl = extractProfileUrl(profileUrl);

    // Set a global timeout for the entire operation
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error("The profile analysis process timed out. Please try again.")
        );
      }, 60000); // 60 second total timeout (increased from 45s)
    });

    // Fetch profile data with retry mechanism
    log("Starting profile data fetch...");
    const fetchPromise = fetchProfileData(cleanProfileUrl);

    // Use Promise.race to implement timeout
    const profileData = await Promise.race([fetchPromise, timeoutPromise]);

    log("Profile data fetch completed");

    // Check if we have sufficient data for a meaningful analysis
    const hasSufficientData =
      profileData.full_name ||
      profileData.headline ||
      profileData.summary ||
      (profileData.experiences && profileData.experiences.length > 0);

    if (!hasSufficientData) {
      throw new Error(
        "Insufficient profile data for analysis. Please try a different profile or check the URL."
      );
    }

    // Generate analysis prompt
    const analysisPrompt = generateAnalysisPrompt(profileData);
    log("Analysis prompt generated");

    // Perform AI analysis with retries
    log("Starting AI analysis...");
    return await analyzeWithAI(analysisPrompt, signal);
  } catch (error: unknown) {
    log("LinkedIn analysis error:", error);

    // Handle Error objects
    if (error instanceof Error) {
      if (error.name === "AbortError" || signal?.aborted) {
        throw new Error("Analysis cancelled by user");
      }

      // Provide more specific error messages
      if (
        error.message.includes("timeout") ||
        error.message.includes("timed out")
      ) {
        throw new Error(
          "The analysis is taking too long. Please try again later."
        );
      }

      if (error.message.includes("RapidAPI")) {
        throw new Error("LinkedIn API error: Failed to fetch profile data");
      }

      if (
        error.message.includes("OpenRouter") ||
        error.message.includes("AI API request failed")
      ) {
        throw new Error("AI service error: Failed to analyze profile");
      }

      if (error.message.includes("not properly configured")) {
        throw new Error(
          "Configuration error: LinkedIn analysis service is not properly configured"
        );
      }

      throw error;
    }

    // For non-Error objects
    throw new Error("An unexpected error occurred during analysis");
  }
}

export function clearCache() {
  cache.clear();
}

export function clearProfileCache(profileUrl: string) {
  const cacheKey = `profile:${profileUrl}`;
  cache.delete(cacheKey);
}

// Helper function to format data for Supabase
export function formatForDatabase(data: LinkedInAnalysisResult): {
  profile_score: number;
  suggestions: ProfileSuggestion[] | string;
  strengths: string[] | string;
  weaknesses: string[] | string;
  suggestions_json?: string;
  strengths_json?: string;
  weaknesses_json?: string;
} {
  // Ensure data is clean and valid
  const cleanedSuggestions = Array.isArray(data.suggestions)
    ? data.suggestions
    : [];
  const cleanedStrengths = Array.isArray(data.strengths) ? data.strengths : [];
  const cleanedWeaknesses = Array.isArray(data.weaknesses)
    ? data.weaknesses
    : [];

  try {
    // Format for database with proper JSON formatting
    let formattedSuggestions: string;
    let formattedStrengths: string;
    let formattedWeaknesses: string;

    // Try to stringify the arrays safely
    try {
      formattedSuggestions = JSON.stringify(cleanedSuggestions);
    } catch (e) {
      log("Error stringifying suggestions:", e);
      formattedSuggestions = "[]";
    }

    try {
      formattedStrengths = JSON.stringify(cleanedStrengths);
    } catch (e) {
      log("Error stringifying strengths:", e);
      formattedStrengths = "[]";
    }

    try {
      formattedWeaknesses = JSON.stringify(cleanedWeaknesses);
    } catch (e) {
      log("Error stringifying weaknesses:", e);
      formattedWeaknesses = "[]";
    }

    log("Formatted data for Supabase");

    // Return both original arrays and stringified versions
    return {
      profile_score: data.score,
      suggestions: cleanedSuggestions, // Original data
      strengths: cleanedStrengths, // Original data
      weaknesses: cleanedWeaknesses, // Original data
      // Add these for convenience - use these for database
      suggestions_json: formattedSuggestions,
      strengths_json: formattedStrengths,
      weaknesses_json: formattedWeaknesses,
    };
  } catch (error) {
    log("Error formatting data for database:", error);
    // Return safe fallback values
    return {
      profile_score: data.score,
      suggestions: "[]",
      strengths: "[]",
      weaknesses: "[]",
      suggestions_json: "[]",
      strengths_json: "[]",
      weaknesses_json: "[]",
    };
  }
}
