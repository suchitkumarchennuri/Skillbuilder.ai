import { wrap } from "comlink";
import type { Remote } from "comlink";
import { memoize, PerformanceMonitor } from "./utils";
import { analyzeWithGemini } from "./gemini";
import { TECHNICAL_SKILLS, SOFT_SKILLS } from "./constants";
import type { AnalysisWorker } from "./workers/analysisWorker";

// Optimized caching with LRU cache
const analysisCache = new Map<
  string,
  {
    result: any;
    timestamp: number;
  }
>();

const CACHE_TTL = 1000 * 60 * 30; // 30 minutes
const MAX_CACHE_SIZE = 100;

function getCacheKey(resumeText: string, jobDescription: string): string {
  return `${resumeText.slice(0, 100)}:${jobDescription.slice(0, 100)}`;
}

function cleanCache() {
  const now = Date.now();
  for (const [key, value] of analysisCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      analysisCache.delete(key);
    }
  }

  // Remove oldest entries if cache is too large
  if (analysisCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(analysisCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < entries.length - MAX_CACHE_SIZE; i++) {
      analysisCache.delete(entries[i][0]);
    }
  }
}

// Lazy-initialize worker
let worker: Remote<AnalysisWorker> | null = null;

function getWorker(): Remote<AnalysisWorker> {
  if (!worker) {
    // Only create the worker once
    const workerScript = new Worker(
      new URL("./workers/analysisWorker.ts", import.meta.url),
      { type: "module" }
    );
    worker = wrap<AnalysisWorker>(workerScript);
  }
  return worker;
}

// Optimized analysis service
export const analysisService = {
  async analyzeResume(
    resumeText: string,
    jobDescription: string,
    signal?: AbortSignal
  ) {
    if (!import.meta.env.VITE_OPENROUTER_API_KEY) {
      throw new Error("Resume analysis service is not properly configured");
    }

    const performanceMonitor = PerformanceMonitor.getInstance();
    const endMeasurement =
      performanceMonitor.startMeasurement("total-analysis");

    try {
      // Generate a cache key based on resume and job description
      const cacheKey = getCacheKey(resumeText, jobDescription);

      // Check memory cache first (fastest)
      const cached = analysisCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.debug("Using in-memory cache for analysis");
        return cached.result;
      }

      // Then check local storage (persistent across page refreshes)
      try {
        const storageKey = `resume_analysis_${btoa(cacheKey)}`;
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
          const { result, timestamp } = JSON.parse(storedData);
          if (Date.now() - timestamp < CACHE_TTL) {
            console.debug("Using localStorage cache for analysis");
            // Also update memory cache
            analysisCache.set(cacheKey, { result, timestamp });
            return result;
          }
        }
      } catch (e) {
        console.error("Error accessing localStorage:", e);
        // Continue with analysis if localStorage fails
      }

      // Clean cache periodically (in background)
      setTimeout(() => cleanCache(), 0);

      console.debug("Cache miss - performing new analysis");

      // Extract skills from both resume and job description (in parallel)
      console.debug("Starting skills extraction and AI analysis in parallel");
      const startTimeSkills = Date.now();
      const startTimeAI = Date.now();

      const analysisWorker = getWorker();

      // Run these operations in parallel
      const [resumeSkills, jobSkills, geminiAnalysis] = await Promise.all([
        analysisWorker.extractSkills(resumeText),
        analysisWorker.extractSkills(jobDescription),
        analyzeWithGemini(resumeText, jobDescription, signal),
      ]);

      console.debug(
        `Skills extraction completed in ${Date.now() - startTimeSkills}ms`
      );
      console.debug(`AI analysis completed in ${Date.now() - startTimeAI}ms`);

      if (signal?.aborted) {
        throw new Error("Analysis cancelled by user");
      }

      // Calculate matching and missing skills using the worker
      const [matchingSkills, missingSkills, score] = await Promise.all([
        analysisWorker.calculateMatchingSkills(resumeSkills, jobSkills),
        analysisWorker.calculateMissingSkills(resumeSkills, jobSkills),
        analysisWorker.calculateMatchScore(resumeSkills, jobSkills),
      ]);

      // Extract bullet points
      const suggestions = geminiAnalysis
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => line.trim().replace(/^[•\-]\s*/, ""))
        .slice(0, 5);

      const result = {
        geminiAnalysis,
        matchingSkills,
        missingSkills,
        score,
        suggestions,
      };

      // Cache the result in memory
      const timestamp = Date.now();
      analysisCache.set(cacheKey, {
        result,
        timestamp,
      });

      // Also cache in localStorage for persistence
      try {
        const storageKey = `resume_analysis_${btoa(cacheKey)}`;
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            result,
            timestamp,
          })
        );
      } catch (e) {
        console.error("Error saving to localStorage:", e);
        // Continue even if localStorage fails
      }

      const duration = endMeasurement();
      console.debug(`Total analysis completed in ${duration.toFixed(2)}ms`);

      return result;
    } catch (error) {
      endMeasurement();
      if (error instanceof Error) {
        if (error.name === "AbortError" || signal?.aborted) {
          throw new Error("Analysis cancelled by user");
        }
        throw error;
      }
      throw new Error("An unexpected error occurred");
    }
  },
};
