import { wrap } from 'comlink';
import type { Remote } from 'comlink';
import { memoize, PerformanceMonitor } from './utils';
import { analyzeWithGemini } from './gemini';
import { TECHNICAL_SKILLS, SOFT_SKILLS } from './constants';

// Optimized caching with LRU cache
const analysisCache = new Map<string, {
  result: any;
  timestamp: number;
}>();

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

// Extract skills from text
function extractSkills(text: string): Set<string> {
  const words = text.toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const skills = new Set<string>();
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Check single words
    if (TECHNICAL_SKILLS.has(word) || SOFT_SKILLS.has(word)) {
      skills.add(word);
      continue;
    }

    // Check compound words (e.g., "react-native")
    if (word.includes('-')) {
      const parts = word.split('-');
      if (parts.some(part => TECHNICAL_SKILLS.has(part))) {
        skills.add(word);
        continue;
      }
    }

    // Check multi-word skills (e.g., "machine learning")
    if (i < words.length - 1) {
      const twoWords = `${word} ${words[i + 1]}`;
      if (TECHNICAL_SKILLS.has(twoWords)) {
        skills.add(twoWords);
        i++; // Skip next word
        continue;
      }

      if (i < words.length - 2) {
        const threeWords = `${word} ${words[i + 1]} ${words[i + 2]}`;
        if (TECHNICAL_SKILLS.has(threeWords)) {
          skills.add(threeWords);
          i += 2; // Skip next two words
        }
      }
    }
  }

  return skills;
}

// Calculate match score based on skills overlap
function calculateMatchScore(resumeSkills: Set<string>, jobSkills: Set<string>): number {
  if (jobSkills.size === 0) return 0;

  const matchingSkills = new Set(
    Array.from(resumeSkills).filter(skill => jobSkills.has(skill))
  );

  const score = (matchingSkills.size / jobSkills.size) * 100;
  return Math.min(Math.round(score), 100);
}

// Optimized analysis service
export const analysisService = {
  async analyzeResume(
    resumeText: string,
    jobDescription: string,
    signal?: AbortSignal
  ) {
    if (!import.meta.env.VITE_OPENROUTER_API_KEY) {
      throw new Error('Resume analysis service is not properly configured');
    }

    const performanceMonitor = PerformanceMonitor.getInstance();
    const endMeasurement = performanceMonitor.startMeasurement('total-analysis');

    try {
      // Check cache first
      const cacheKey = getCacheKey(resumeText, jobDescription);
      const cached = analysisCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.result;
      }

      // Clean cache periodically
      cleanCache();

      // Extract skills from both resume and job description
      const resumeSkills = extractSkills(resumeText);
      const jobSkills = extractSkills(jobDescription);

      // Calculate matching and missing skills
      const matchingSkills = Array.from(resumeSkills).filter(skill => jobSkills.has(skill));
      const missingSkills = Array.from(jobSkills).filter(skill => !resumeSkills.has(skill));

      // Calculate match score
      const score = calculateMatchScore(resumeSkills, jobSkills);

      // Run analysis with enhanced prompt
      const geminiAnalysis = await analyzeWithGemini(resumeText, jobDescription, signal);

      if (signal?.aborted) {
        throw new Error('Analysis cancelled by user');
      }

      // Extract bullet points
      const suggestions = geminiAnalysis
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.trim().replace(/^[•\-]\s*/, ''))
        .slice(0, 5);

      const result = {
        geminiAnalysis,
        matchingSkills,
        missingSkills,
        score,
        suggestions,
      };

      // Cache the result
      analysisCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      const duration = endMeasurement();
      console.debug(`Total analysis completed in ${duration.toFixed(2)}ms`);

      return result;
    } catch (error) {
      endMeasurement();
      if (error instanceof Error) {
        if (error.name === 'AbortError' || signal?.aborted) {
          throw new Error('Analysis cancelled by user');
        }
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }
};