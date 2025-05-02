import { z } from "zod";
import { memoize, PerformanceMonitor } from "./utils";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const MODEL = "google/gemini-flash-1.5-8b";
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes
const API_TIMEOUT = 30000; // 30 seconds

// Add configuration check helper
export const isGeminiConfigured = (): boolean => {
  return Boolean(OPENROUTER_API_KEY);
};

const responseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    })
  ),
});

// Enhanced prompt for more accurate analysis - optimized for speed
const SYSTEM_PROMPT = `You are an expert resume analyst. Analyze the provided resume and job description to generate relevant bullet points. Focus on:
1. Key skills that match the job
2. Quantifiable achievements 
3. Relevant experience
4. Areas needing improvement

Format: Exactly 5 bullet points, each beginning with •
Keep responses concise and directly address job requirements.`;

// Add retry utility
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const analyzeWithGemini = memoize(
  async (
    resumeText: string,
    jobDescription: string,
    signal?: AbortSignal
  ): Promise<string> => {
    if (!OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key is not configured");
    }

    const performanceMonitor = PerformanceMonitor.getInstance();
    const endMeasurement =
      performanceMonitor.startMeasurement("gemini-analysis");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const MAX_RETRIES = 2;
      let retries = 0;
      let lastError: Error | null = null;

      while (retries <= MAX_RETRIES) {
        if (signal?.aborted) {
          throw new Error("Analysis cancelled by user");
        }

        try {
          // Prepare summarized content to reduce token count
          const resumeSummary =
            resumeText.length > 1500
              ? resumeText.substring(0, 1500) + "..."
              : resumeText;

          const jobSummary =
            jobDescription.length > 1000
              ? jobDescription.substring(0, 1000) + "..."
              : jobDescription;

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
                    content: SYSTEM_PROMPT,
                  },
                  {
                    role: "user",
                    content: `Job Description:\n${jobSummary}\n\nResume:\n${resumeSummary}`,
                  },
                ],
                max_tokens: 250, // Reduced from 300
                temperature: 0.1, // Reduced from 0.2 for faster responses
                top_p: 0.7, // Reduced from 0.9 for faster responses
                presence_penalty: 0, // Removed penalties for speed
                frequency_penalty: 0, // Removed penalties for speed
                response_format: { type: "text" }, // Plain text for faster parsing
              }),
              signal: signal ? signal : controller.signal,
            }
          );

          if (!response.ok) {
            // For 429 (rate limit) and 5xx (server errors), retry
            if (response.status === 429 || response.status >= 500) {
              lastError = new Error(
                `API request failed: ${response.statusText}`
              );
              throw lastError;
            }
            throw new Error(`API request failed: ${response.statusText}`);
          }

          const data = await response.json();
          const validated = responseSchema.parse(data);
          const result = validated.choices[0].message.content;

          const duration = endMeasurement();
          console.debug(
            `Gemini analysis completed in ${duration.toFixed(
              2
            )}ms after ${retries} retries`
          );

          return result;
        } catch (error) {
          // If the last retry or a non-retriable error, rethrow
          if (
            retries === MAX_RETRIES ||
            (error instanceof Error && error.name === "AbortError")
          ) {
            throw error;
          }

          // Otherwise increment retry counter and wait before retrying
          retries++;
          const backoffTime = 1000 * Math.pow(2, retries); // Exponential backoff: 2s, 4s
          console.debug(
            `Retry ${retries}/${MAX_RETRIES} after ${backoffTime}ms`
          );
          await wait(backoffTime);
        }
      }

      // This shouldn't happen but just in case
      if (lastError) {
        throw lastError;
      }
      throw new Error("Unexpected error in retry logic");
    } finally {
      clearTimeout(timeoutId);
    }
  },
  100,
  CACHE_TTL
);
