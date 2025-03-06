import axios from 'axios';
import { z } from 'zod';
import { memoize } from './utils';
import type { ProfileSuggestion } from '../types';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
const MODEL = 'google/gemini-flash-1.5-8b';
const API_TIMEOUT = 30000; // Increased timeout to 30 seconds
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache

if (!OPENROUTER_API_KEY || !RAPIDAPI_KEY) {
  throw new Error('Missing required API keys in environment variables');
}

// Response validation schemas
const openRouterResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.string(),
    }),
  })).min(1),
});

// Optimized profile schema with faster validation
const linkedinProfileSchema = z.object({
  status: z.string().optional(),
  data: z.object({
    full_name: z.string().optional(),
    headline: z.string().optional(),
    summary: z.string().optional(),
    occupation: z.string().optional(),
    experiences: z.array(z.object({
      company: z.string(),
      title: z.string(),
      description: z.string().optional(),
      location: z.string().optional(),
      starts_at: z.object({
        month: z.number(),
        year: z.number()
      }).optional(),
      ends_at: z.object({
        month: z.number(),
        year: z.number()
      }).optional(),
    })).optional().default([]),
    education: z.array(z.object({
      school: z.string(),
      degree_name: z.string().optional(),
      field_of_study: z.string().optional(),
      starts_at: z.object({
        year: z.number()
      }).optional(),
      ends_at: z.object({
        year: z.number()
      }).optional(),
    })).optional().default([]),
    skills: z.union([
      z.string(),
      z.array(z.string())
    ]).transform(val => {
      if (typeof val === 'string') {
        return val.split(',').map(s => s.trim()).filter(Boolean);
      }
      return val;
    }).optional().default([]),
    certifications: z.array(z.object({
      name: z.string(),
      issuing_organization: z.string().optional(),
      issue_date: z.string().optional(),
    })).optional().default([]),
  }),
}).transform(data => data.data);

interface LinkedInAnalysisResult {
  score: number;
  suggestions: ProfileSuggestion[];
}

// Optimized caching with Map
const cache = new Map<string, { data: any; timestamp: number }>();

// Clear expired cache entries
function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

// Optimized URL extraction
function extractProfileUrl(url: string): string {
  const urlPattern = /linkedin\.com\/in\/([^\/\?#]+)/i;
  const match = url.match(urlPattern);
  if (!match) {
    throw new Error('Invalid LinkedIn profile URL format. Please provide a valid profile URL (e.g., https://www.linkedin.com/in/username)');
  }
  return url;
}

// Optimized profile data fetching with retries and caching
async function fetchProfileData(profileUrl: string, retries = 2) {
  const cacheKey = `profile:${profileUrl}`;
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await axios.get('https://fresh-linkedin-profile-data.p.rapidapi.com/get-linkedin-profile', {
      params: {
        linkedin_url: profileUrl,
        include_skills: 'true',
        include_certifications: 'true'
      },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'fresh-linkedin-profile-data.p.rapidapi.com'
      },
      signal: controller.signal,
      timeout: API_TIMEOUT,
    });

    const validatedData = linkedinProfileSchema.parse(response.data);
    
    // Cache successful response
    cache.set(cacheKey, {
      data: validatedData,
      timestamp: Date.now()
    });
    
    return validatedData;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Please try again.');
      }
      if (error.response?.status === 429 && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchProfileData(profileUrl, retries - 1);
      }
      if (error.response?.status === 404) {
        throw new Error('LinkedIn profile not found. Please check the URL and try again.');
      }
      throw new Error(`Failed to fetch profile data: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Optimized analysis prompt generation
function generateAnalysisPrompt(profile: z.infer<typeof linkedinProfileSchema>): string {
  const sections: string[] = [];

  if (profile.full_name || profile.headline || profile.occupation) {
    sections.push(`Profile: ${[
      profile.full_name,
      profile.headline,
      profile.occupation
    ].filter(Boolean).join(' | ')}`);
  }

  if (profile.summary) {
    sections.push(`Summary: ${profile.summary}`);
  }

  if (profile.experiences?.length) {
    sections.push('Experience:\n' + profile.experiences
      .map(exp => {
        const duration = exp.starts_at ? 
          `${exp.starts_at.year}${exp.ends_at ? ` - ${exp.ends_at.year}` : ' - Present'}` : '';
        return `- ${exp.title} at ${exp.company} ${duration}`;
      })
      .join('\n')
    );
  }

  if (profile.skills?.length) {
    sections.push(`Skills: ${profile.skills.join(', ')}`);
  }

  return sections.join('\n\n');
}

// Optimized AI response parsing
function parseAIResponse(content: string): LinkedInAnalysisResult {
  const scoreMatch = content.match(/(?:score|rating):\s*(\d+)/i);
  const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 50;

  const suggestions: ProfileSuggestion[] = [];
  const sections = content.split(/\n{2,}/);

  for (const section of sections) {
    const lines = section.split('\n');
    const sectionType = 
      /experience|work|position|role|education/i.test(section) ? 'experience' :
      /network|connection|engagement|endorsement/i.test(section) ? 'network' : 
      'profile';

    for (const line of lines) {
      const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
      if (cleanLine.length > 10) {
        suggestions.push({
          section: sectionType,
          suggestion: cleanLine,
          priority: /critical|crucial|essential|urgent|important|must|should|need to/i.test(cleanLine) ? 'high' :
                    /consider|might|could|optional|maybe/i.test(cleanLine) ? 'low' : 
                    'medium'
        });
      }
    }
  }

  return {
    score,
    suggestions: suggestions.length > 0 ? suggestions : [{
      section: 'profile',
      suggestion: 'Add more details to your profile',
      priority: 'medium'
    }]
  };
}

// Memoized analysis function
const analyzeWithAI = memoize(async (prompt: string, signal?: AbortSignal): Promise<LinkedInAnalysisResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a LinkedIn profile analyzer. Analyze the profile and provide a score (0-100) and specific, actionable suggestions for improvement.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
      signal: signal || controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const validated = openRouterResponseSchema.parse(data);
    return parseAIResponse(validated.choices[0].message.content);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || signal?.aborted) {
        throw new Error('Analysis cancelled');
      }
      throw new Error(`AI analysis failed: ${error.message}`);
    }
    throw new Error('An unexpected error occurred during analysis');
  } finally {
    clearTimeout(timeoutId);
  }
}, 50, CACHE_TTL);

// Main analysis function with optimized flow and better error handling
export async function analyzeLinkedInProfile(
  profileUrl: string,
  signal?: AbortSignal
): Promise<LinkedInAnalysisResult> {
  try {
    // Clean cache periodically
    clearExpiredCache();

    // Validate and clean profile URL
    const cleanProfileUrl = extractProfileUrl(profileUrl);
    
    // Fetch profile data
    const profileData = await fetchProfileData(cleanProfileUrl);
    
    // Generate analysis prompt
    const analysisPrompt = generateAnalysisPrompt(profileData);
    
    // Perform AI analysis
    return await analyzeWithAI(analysisPrompt, signal);
  } catch (error) {
    console.error('LinkedIn analysis error:', error);
    if (error instanceof Error) {
      if (error.name === 'AbortError' || signal?.aborted) {
        throw new Error('Analysis cancelled by user');
      }
      throw new Error(error.message);
    }
    throw new Error('An unexpected error occurred during analysis');
  }
}

// Cache management
export function clearCache() {
  cache.clear();
}

export function clearProfileCache(profileUrl: string) {
  const cacheKey = `profile:${profileUrl}`;
  cache.delete(cacheKey);
}