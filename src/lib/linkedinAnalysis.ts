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
 * - Web Worker offloading for performance
 */

import { z } from "zod";
import { wrap } from "comlink";
import type { Remote } from "comlink";
import axios from "axios";
import type { ProfileSuggestion } from "../types";

// Import type for the worker
import type { LinkedInWorker } from "./workers/linkedinWorker";

// Constants for API calls
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || "";
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
const MODEL = "google/gemini-2.5-flash-preview";
const API_TIMEOUT = 30000; // Increased timeout for reliability (30 seconds)
const MAX_RETRIES = 2; // Increased retry attempts for reliability
const CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days cache (increased from 14 days)
const LIGHTWEIGHT_MODE = true; // Extract minimal data to speed up parsing

// Add configuration check helper
export const isLinkedInAnalysisConfigured = (): boolean => {
  return Boolean(RAPIDAPI_KEY) && Boolean(OPENROUTER_API_KEY);
};

// Lazy-load worker
let worker: Remote<LinkedInWorker> | null = null;

function getWorker(): Remote<LinkedInWorker> {
  if (!worker) {
    // Only create the worker once
    const workerScript = new Worker(
      new URL("./workers/linkedinWorker.ts", import.meta.url),
      { type: "module" }
    );
    worker = wrap<LinkedInWorker>(workerScript);
  }
  return worker;
}

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
const DEBUG =
  new URL(window.location.href).searchParams.get("debug") === "true";

// Log function with verbose option
function log(message: string, data?: any, verbose = false) {
  if (DEBUG || (verbose && window.location.href.includes("verbose=true"))) {
    console.log(`[LinkedIn Analysis] ${message}`, data || "");
  }
}

// Helper to check if verbose debugging is enabled
function isVerboseMode(): boolean {
  return window.location.href.includes("verbose=true");
}

// Streamlined prompt generation with minimal content
function generateAnalysisPrompt(
  profile: z.infer<typeof linkedinProfileSchema>
): string {
  // Essential sections only
  const sections: string[] = [];

  // Basic profile info in a compact format
  const profileHeader = [profile.full_name, profile.headline]
    .filter(Boolean)
    .join(" | ");

  if (profileHeader) {
    sections.push(`PROFILE: ${profileHeader}`);
  }

  // Include only a brief summary
  if (profile.summary) {
    const briefSummary =
      profile.summary.length > 200
        ? profile.summary.substring(0, 200) + "..."
        : profile.summary;
    sections.push(`SUMMARY: ${briefSummary}`);
  }

  // Focus only on key experience details
  if (profile.experiences?.length) {
    // Only include the 3 most recent experiences
    const recentExperiences = profile.experiences.slice(0, 3);

    const experienceSection = recentExperiences
      .map((exp, index) => {
        // Format dates concisely
        const duration = exp.starts_at?.year
          ? `${exp.starts_at.year}${
              exp.ends_at?.year ? `-${exp.ends_at.year}` : "-Present"
            }`
          : "";

        // Only include essential description information
        const description = exp.description
          ? ` Highlights: ${exp.description.substring(0, 150)}${
              exp.description.length > 150 ? "..." : ""
            }`
          : "";

        return `- ${exp.title} at ${exp.company} (${duration})${description}`;
      })
      .join("\n");

    sections.push(`EXPERIENCE:\n${experienceSection}`);
  }

  // Add skills as simple list (if available)
  if (Array.isArray(profile.skills) && profile.skills.length) {
    const skillsList = profile.skills
      .slice(0, 8) // Only include top skills
      .map((skill) => (typeof skill === "string" ? skill : skill.name))
      .filter(Boolean)
      .join(", ");

    if (skillsList) {
      sections.push(`SKILLS: ${skillsList}`);
    }
  }

  return sections.join("\n\n") || "Insufficient profile data available";
}

// Adding a function for progress updates that can be called from any part of the process
function updateAnalysisStatus(
  status: "started" | "fetching" | "analyzing" | "complete" | "error",
  message: string
) {
  if (typeof window !== "undefined" && window.dispatchEvent) {
    log(`Analysis status: ${status} - ${message}`);
    window.dispatchEvent(
      new CustomEvent("linkedin-analysis-status", {
        detail: { status, message },
      })
    );
  }
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

  // Check for "force fresh" flag in session storage
  const forceFresh = sessionStorage.getItem("linkedin_force_fresh") === "true";
  if (forceFresh) {
    sessionStorage.removeItem("linkedin_force_fresh");
    log("Force fresh data requested, skipping cache");
  } else {
    // First check memory cache with higher priority - most efficient
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
  }

  log(
    `Fetching profile data (attempt ${MAX_RETRIES - retries + 1}/${
      MAX_RETRIES + 1
    })...`
  );

  // Calculate backoff delay for retries (exponential backoff)
  const getBackoffDelay = (attempt: number) =>
    Math.min(2000 * Math.pow(2, attempt), 8000);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    // Create a promise to track request status with request body optimization
    const requestPromise = axios({
      method: "get",
      url: "https://linkedin-api8.p.rapidapi.com/get-profile-data-by-url",
      params: {
        url: profileUrl,
        // Request only essential fields to reduce response size and parsing time
        fields: "full_name,headline,summary,experiences,skills",
      },
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "linkedin-api8.p.rapidapi.com",
        // Additional optimizations for faster responses
        "Accept-Encoding": "gzip,deflate,compress",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
      timeout: API_TIMEOUT,
    });

    // Add response interceptor for timing measurements
    const startTime = Date.now();
    requestPromise.then(() => {
      const duration = Date.now() - startTime;
      log(`LinkedIn API request completed in ${duration}ms`);
      if (duration > 5000) {
        // Log slow requests for monitoring
        console.warn(
          `Slow LinkedIn API request (${duration}ms) for ${profileUrl}`
        );
      }
    });

    const response = await requestPromise;

    // Process API response data
    try {
      // Validate that we received some data
      if (!response.data) {
        throw new Error("LinkedIn API returned empty data");
      }

      const responseData = response.data;

      // Log raw response structure for debugging
      console.log("LINKEDIN API RESPONSE STRUCTURE:", {
        status: response.status,
        dataType: typeof responseData,
        hasFullName: Boolean(responseData?.full_name),
        hasHeadline: Boolean(responseData?.headline),
        hasSummary: Boolean(responseData?.summary),
        hasExperiences: Array.isArray(responseData?.experiences),
        experiencesCount: Array.isArray(responseData?.experiences)
          ? responseData.experiences.length
          : 0,
        hasSkills: Array.isArray(responseData?.skills),
        skillsCount: Array.isArray(responseData?.skills)
          ? responseData.skills.length
          : 0,
        responseTime: `${Date.now() - startTime}ms`,
      });

      // In verbose mode, log the full raw response data (careful with large responses)
      if (isVerboseMode()) {
        try {
          // Create a safe copy of the data removing any potential circular references
          const safeResponseData = JSON.parse(JSON.stringify(responseData));
          console.log("VERBOSE: FULL LINKEDIN API RESPONSE:", safeResponseData);
        } catch (e) {
          console.log("VERBOSE: Could not stringify full response data");
        }
      }

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

      // Lightweight extraction mode to speed up parsing
      if (LIGHTWEIGHT_MODE) {
        const lightweightData = {
          full_name: responseData?.full_name || "",
          headline: responseData?.headline || "",
          summary: responseData?.summary?.substring(0, 500) || "", // Only extract first 500 chars of summary
          experiences: Array.isArray(responseData?.experiences)
            ? responseData.experiences
                .slice(0, 3) // Only process the 3 most recent experiences
                .map((exp: any) => ({
                  company: typeof exp?.company === "string" ? exp.company : "",
                  title: typeof exp?.title === "string" ? exp.title : "",
                  // Only include essential description data or truncate long descriptions
                  description:
                    typeof exp?.description === "string"
                      ? exp.description.substring(0, 200) +
                        (exp.description.length > 200 ? "..." : "")
                      : "",
                  // Simplified date handling
                  starts_at: exp?.starts_at?.year
                    ? { year: exp.starts_at.year }
                    : null,
                  ends_at: exp?.ends_at?.year
                    ? { year: exp.ends_at.year }
                    : null,
                }))
            : [],
          skills: Array.isArray(responseData?.skills)
            ? responseData.skills
                .slice(0, 10)
                .map((skill: any) =>
                  typeof skill === "string" ? skill : skill?.name || ""
                )
            : [],
        };

        // Console log the extracted data for debugging
        console.log("EXTRACTED LINKEDIN DATA:", {
          name: lightweightData.full_name,
          headline: lightweightData.headline,
          experienceCount: lightweightData.experiences.length,
          skillsCount: lightweightData.skills.length,
          dataSize: JSON.stringify(lightweightData).length + " bytes",
          timestamp: new Date().toISOString(),
          extractionTime: `${Date.now() - startTime}ms`,
        });

        // Log first experience if available (for debugging)
        if (lightweightData.experiences.length > 0) {
          console.log("FIRST EXPERIENCE:", lightweightData.experiences[0]);
        }

        // Log first few skills if available (for debugging)
        if (lightweightData.skills.length > 0) {
          console.log("SKILLS SAMPLE:", lightweightData.skills.slice(0, 3));
        }

        const timestamp = Date.now();
        cache.set(cacheKey, { data: lightweightData, timestamp });

        try {
          const storageKey = `linkedin_profile_${btoa(profileUrl)}`;
          localStorage.setItem(
            storageKey,
            JSON.stringify({ data: lightweightData, timestamp })
          );
        } catch (e) {
          log("Unable to save to localStorage", e);
        }

        return lightweightData;
      }

      // Check if we have the minimum required fields
      if (
        !responseData.full_name &&
        !responseData.headline &&
        !responseData.experiences
      ) {
        log("LinkedIn API response is missing essential data");

        // If we have retries left, try again with exponential backoff
        if (retries > 0) {
          log(
            `Incomplete data received, retrying (${retries} attempts left)...`
          );
          // Wait with exponential backoff before retrying
          const backoffDelay = getBackoffDelay(MAX_RETRIES - retries);
          log(`Waiting ${backoffDelay}ms before next attempt`);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
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

function parseAIResponse(content: string): LinkedInAnalysisResult {
  // Extract score with efficient pattern matching
  const scoreMatch = content.match(/(?:score|rating):\s*(\d+)/i);
  const score = scoreMatch
    ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)))
    : 50;

  // Initialize with empty arrays
  const suggestions: ProfileSuggestion[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Fast extract using regex pattern matching
  const strengthsMatch = content.match(
    /strengths?:?\s*(.+?)(?=weaknesses?:|\n\n|$)/is
  );
  const weaknessesMatch = content.match(
    /weaknesses?:?\s*(.+?)(?=suggestions?:|\n\n|$)/is
  );
  const suggestionsMatch = content.match(/suggestions?:?\s*(.+?)(?=\n\n|$)/is);

  // Process strengths (limited to max 3)
  if (strengthsMatch && strengthsMatch[1]) {
    const items = strengthsMatch[1]
      .split(/\n/)
      .filter((line) => line.trim().length > 5 && /^[-•*]/.test(line.trim()))
      .slice(0, 3);

    for (const item of items) {
      strengths.push(item.replace(/^[-•*]\s*/, "").trim());
    }
  }

  // Process weaknesses (limited to max 3)
  if (weaknessesMatch && weaknessesMatch[1]) {
    const items = weaknessesMatch[1]
      .split(/\n/)
      .filter((line) => line.trim().length > 5 && /^[-•*]/.test(line.trim()))
      .slice(0, 3);

    for (const item of items) {
      weaknesses.push(item.replace(/^[-•*]\s*/, "").trim());
    }
  }

  // Process suggestions (limited to max 3)
  if (suggestionsMatch && suggestionsMatch[1]) {
    const items = suggestionsMatch[1]
      .split(/\n/)
      .filter((line) => line.trim().length > 5 && /^[-•*]/.test(line.trim()))
      .slice(0, 3);

    for (const item of items) {
      const text = item.replace(/^[-•*]\s*/, "").trim();

      // Quick classification using keyword matching
      const section =
        /experience|work|job|role|position|company|project|achievement/i.test(
          text
        )
          ? "experience"
          : /network|connect|endorsement/i.test(text)
          ? "network"
          : "profile";

      // Simple priority assignment based on urgency terms
      const priority =
        /critical|important|essential|crucial|necessary|must|should/i.test(text)
          ? "high"
          : /consider|may|might|could|try/i.test(text)
          ? "low"
          : "medium";

      suggestions.push({ section, suggestion: text, priority });
    }
  }

  // Return with defaults if empty
  return {
    score,
    suggestions:
      suggestions.length > 0
        ? suggestions
        : [
            {
              section: "experience",
              suggestion:
                "Add specific achievements with metrics to your experience.",
              priority: "high",
            },
          ],
    strengths:
      strengths.length > 0 ? strengths : ["Has professional experience"],
    weaknesses:
      weaknesses.length > 0
        ? weaknesses
        : ["Limited quantifiable achievements"],
  };
}

// Simplified AI analysis function with retry capabilities
async function analyzeWithAI(
  prompt: string,
  signal?: AbortSignal,
  retries = 1
): Promise<LinkedInAnalysisResult> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key is not configured");
  }

  try {
    // Create an internal abort controller for the AI API request that respects the outer signal
    const controller = new AbortController();

    // Set up a timeout (shorter than the global timeout)
    const ANALYSIS_TIMEOUT = 25000; // 25 seconds max for AI analysis
    const timeoutId = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT);

    // If the original signal aborts, also abort our internal controller
    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          controller.abort();
          clearTimeout(timeoutId);
        },
        { once: true }
      );
    }

    // Use systemless prompt format for faster responses
    const messages = [
      {
        role: "user",
        content: `LinkedIn profile review:

${prompt}

Output format (numbers only):
Score (1-100): [number]
Strengths:
- [strength 1]
- [strength 2]
Weaknesses:
- [weakness 1]
- [weakness 2]
Suggestions:
- [suggestion 1]
- [suggestion 2]`,
      },
    ];

    try {
      log("Starting AI request");
      const startTime = Date.now();

      const requestPromise = axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: MODEL,
          messages,
          // Extreme optimization for speed
          temperature: 0.1, // Lower temperature for faster, more deterministic responses
          max_tokens: 300, // Reduced token limit for faster completion
          top_p: 0.5, // Lower top_p for more deterministic and faster responses
          frequency_penalty: 0, // No penalties for faster processing
          presence_penalty: 0, // No penalties for faster processing
          response_format: { type: "text" }, // Plain text for faster parsing
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            // Request optimizations
            "HTTP-Referer": window.location.origin,
            "X-Title": "LinkedIn Profile Analysis",
          },
          signal: controller.signal,
          timeout: ANALYSIS_TIMEOUT,
        }
      );

      const response = await requestPromise;

      const duration = Date.now() - startTime;
      log(`AI analysis completed in ${duration}ms`);

      // Log AI response timing for performance tracking
      console.log("AI RESPONSE TIMING:", {
        totalTimeMs: duration,
        model: MODEL,
        promptTokens: prompt.length / 4, // Rough estimate
        timestamp: new Date().toISOString(),
      });

      const parseResult = openRouterResponseSchema.safeParse(response.data);
      if (!parseResult.success) {
        throw new Error("Invalid response format from AI service");
      }

      const responseContent = parseResult.data.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error("Empty response from AI service");
      }

      // In verbose mode, log the complete AI response content
      if (isVerboseMode()) {
        console.log("VERBOSE: COMPLETE AI RESPONSE:", {
          content: responseContent,
          rawData: parseResult.data,
          timestamp: new Date().toISOString(),
        });
      }

      // Parse the AI response into our expected format
      const result = parseAIResponse(responseContent);

      // Log the final processed result
      console.log("FINAL LINKEDIN ANALYSIS:", {
        score: result.score,
        strengthsCount: result.strengths.length,
        weaknessesCount: result.weaknesses.length,
        suggestionsCount: result.suggestions.length,
        processingTimeMs: Date.now() - startTime,
      });

      return result;
    } catch (error: any) {
      if (
        (axios.isAxiosError(error) && error.code === "ECONNABORTED") ||
        error.name === "AbortError" ||
        error.message.includes("aborted")
      ) {
        throw new Error("AI analysis timed out. Please try again.");
      }

      // For rate limiting or server errors, retry if we have retries left
      if (
        retries > 0 &&
        axios.isAxiosError(error) &&
        (error.response?.status === 429 || error.response?.status === 500)
      ) {
        log(`AI service error (${error.response?.status}), retrying...`);
        const backoffDelay = 1000 * Math.pow(2, 2 - retries); // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        return analyzeWithAI(prompt, signal, retries - 1);
      }

      // Rethrow the error for other cases
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    if (
      error.message.includes("aborted") ||
      error.message.includes("timed out")
    ) {
      throw new Error("Analysis was cancelled or timed out. Please try again.");
    }

    // Return fallback analysis for any other errors
    if (retries === 0) {
      log("All retries failed, returning fallback analysis");
      return {
        score: 65,
        strengths: ["Professional has relevant experience"],
        weaknesses: ["Profile could use more detailed information"],
        suggestions: [
          {
            section: "profile",
            suggestion: "Try again later or update profile with more details",
            priority: "medium",
          },
        ],
      };
    }

    throw error;
  }
}

export async function analyzeLinkedInProfile(
  profileUrl: string,
  signal?: AbortSignal
): Promise<LinkedInAnalysisResult> {
  log("Starting LinkedIn profile analysis process for:", profileUrl);
  const analysisStartTime = Date.now();

  // Begin with logging to console to track performance
  console.log("LINKEDIN ANALYSIS STARTED:", {
    url: profileUrl,
    timestamp: new Date().toISOString(),
    cacheMode:
      sessionStorage.getItem("linkedin_force_fresh") === "true"
        ? "force-fresh"
        : "normal",
  });

  try {
    if (!isLinkedInAnalysisConfigured()) {
      log("LinkedIn analysis not configured");
      throw new Error(
        "LinkedIn analysis service is not properly configured. Please check your environment variables."
      );
    }

    // Show immediate feedback to the user
    updateAnalysisStatus("started", "Starting LinkedIn profile analysis...");

    // Clean cache periodically (moved outside the critical path)
    setTimeout(() => clearExpiredCache(), 0);

    // Validate and clean profile URL
    const cleanProfileUrl = extractProfileUrl(profileUrl);

    // Check if we have a special debug flag to bypass cache
    const debug =
      new URL(window.location.href).searchParams.get("debug") === "true";
    if (debug) {
      sessionStorage.setItem("linkedin_force_fresh", "true");
    }

    // Timeout tracking
    let analysisTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      analysisTimeoutId = setTimeout(() => {
        reject(
          new Error("The profile analysis process timed out. Please try again.")
        );
      }, 45000); // 45 second total timeout
    });

    // Create a combined promise to represent the entire fetch+analyze operation
    const startTime = Date.now();

    // Update progress indicator
    updateAnalysisStatus("fetching", "Fetching LinkedIn profile data...");

    // Fetch profile data with retry mechanism
    log("Starting profile data fetch...");
    const fetchStartTime = Date.now();
    const profileDataRaw = await fetchProfileData(cleanProfileUrl);

    const fetchDuration = Date.now() - fetchStartTime;
    log(`Profile data fetch completed in ${fetchDuration}ms`);

    // Initialize worker
    const analysisWorker = getWorker();
    log("Worker initialized for profile processing");

    // Use worker to process the profile data in parallel with AI analysis
    log("Starting profile data processing with worker...");
    const processingStartTime = Date.now();

    // Process profile data with worker
    const processedData = await analysisWorker.parseProfileData(profileDataRaw);

    const processingDuration = Date.now() - processingStartTime;
    log(`Profile data processing completed in ${processingDuration}ms`);

    // Generate initial suggestions with worker
    const initialSuggestions = await analysisWorker.generateInitialSuggestions(
      processedData
    );

    // Log profile data fetch performance metrics
    console.log("PROFILE DATA PROCESSING COMPLETE:", {
      duration: processingDuration,
      processingTime: processingDuration,
      fetchTime: fetchDuration,
      experiencesCount: processedData.experiences?.length || 0,
      skillsCount: processedData.skills?.length || 0,
      initialScore: processedData.initialScore,
      timestamp: new Date().toISOString(),
    });

    // Update progress for analysis phase
    updateAnalysisStatus("analyzing", "Analyzing profile content...");

    // Check if we have sufficient data for a meaningful analysis
    const hasSufficientData =
      processedData.full_name ||
      processedData.headline ||
      processedData.summary ||
      (processedData.experiences && processedData.experiences.length > 0);

    if (!hasSufficientData) {
      throw new Error(
        "Insufficient profile data for analysis. Please try a different profile or check the URL."
      );
    }

    // Use the preprocessed profile summary from the worker for AI analysis
    const analysisPrompt = processedData.profileSummary;
    log("Analysis prompt generated from worker");

    // Log prompt generation metrics
    console.log("ANALYSIS PROMPT GENERATED:", {
      duration: processingDuration,
      promptLength: analysisPrompt.length,
      estimatedTokens: Math.round(analysisPrompt.length / 4),
    });

    // Perform AI analysis with retries
    log("Starting AI analysis...");
    const aiAnalysisStartTime = Date.now();
    const aiResult = await Promise.race([
      analyzeWithAI(analysisPrompt, signal),
      timeoutPromise,
    ]);

    const aiAnalysisDuration = Date.now() - aiAnalysisStartTime;

    // Combine worker score with AI analysis
    const combinedScore = Math.min(
      Math.round((processedData.initialScore + aiResult.score) / 2),
      100
    );

    // Combine worker suggestions with AI suggestions
    const combinedSuggestions = [
      ...initialSuggestions,
      ...aiResult.suggestions,
    ].slice(0, 10); // Limit to top 10 suggestions

    // Final analysis result
    const analysisResult: LinkedInAnalysisResult = {
      score: combinedScore,
      suggestions: combinedSuggestions,
      strengths: aiResult.strengths,
      weaknesses: aiResult.weaknesses,
    };

    const totalDuration = Date.now() - startTime;
    log(`Total LinkedIn analysis completed in ${totalDuration}ms`);

    // Log complete timing breakdown
    console.log("LINKEDIN ANALYSIS COMPLETE:", {
      totalDuration,
      fetchTime: fetchDuration,
      processingTime: processingDuration,
      aiAnalysisTime: aiAnalysisDuration,
      score: analysisResult.score,
      suggestionsCount: analysisResult.suggestions.length,
      timestamp: new Date().toISOString(),
    });

    // Final success event
    updateAnalysisStatus("complete", "Analysis complete!");

    // Clean up timeout
    clearTimeout(analysisTimeoutId);

    return analysisResult;
  } catch (error: any) {
    const failureDuration = Date.now() - analysisStartTime;
    log("LinkedIn analysis error:", error);

    // Log error information for debugging
    console.error("LINKEDIN ANALYSIS FAILED:", {
      duration: failureDuration,
      errorMessage: error.message,
      errorName: error.name,
      timestamp: new Date().toISOString(),
    });

    // Error event
    updateAnalysisStatus(
      "error",
      error.message || "An error occurred during profile analysis."
    );

    if (
      error.message.includes("timeout") ||
      error.message.includes("timed out")
    ) {
      throw new Error(
        "The LinkedIn profile analysis timed out. This could be due to high demand or network issues. Please try again in a few moments."
      );
    }

    if (
      error.message.includes("aborted") ||
      error.message.includes("cancelled")
    ) {
      throw new Error("The analysis was cancelled.");
    }

    throw error;
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
