import { expose } from "comlink";
import { TECHNICAL_SKILLS, SOFT_SKILLS } from "../constants";

// Cache for repeated operations
const extractSkillsCache = new Map<string, Set<string>>();

/**
 * Worker for skill extraction to off-load processing from the main thread
 */
const extractSkillsWorker = {
  /**
   * Extract skills from text
   */
  extractSkills(text: string): string[] {
    // Use a cache key based on the first 200 chars
    const cacheKey = text.slice(0, 200);
    if (extractSkillsCache.has(cacheKey)) {
      return Array.from(extractSkillsCache.get(cacheKey)!);
    }

    const skills = new Set<string>();
    const normalized = text.toLowerCase().replace(/[^\w\s-]/g, " ");

    // Check for single word skills first (most common case)
    for (const skill of TECHNICAL_SKILLS) {
      if (skill.indexOf(" ") === -1 && skill.indexOf("-") === -1) {
        // For single words, use word boundary regex for more accurate matching
        const regex = new RegExp(`\\b${skill}\\b`, "i");
        if (regex.test(normalized)) {
          skills.add(skill);
        }
      }
    }

    // Then check for multi-word skills
    for (const skill of TECHNICAL_SKILLS) {
      if (skill.indexOf(" ") !== -1 || skill.indexOf("-") !== -1) {
        // For compound words, use a simple but efficient includes check
        if (normalized.includes(skill)) {
          skills.add(skill);
        }
      }
    }

    // Also check soft skills (usually fewer)
    for (const skill of SOFT_SKILLS) {
      const regex = new RegExp(`\\b${skill}\\b`, "i");
      if (regex.test(normalized)) {
        skills.add(skill);
      }
    }

    // Store in cache
    extractSkillsCache.set(cacheKey, skills);

    // Keep cache size limited
    if (extractSkillsCache.size > 50) {
      const keys = Array.from(extractSkillsCache.keys());
      extractSkillsCache.delete(keys[0]); // Remove oldest entry
    }

    return Array.from(skills);
  },

  /**
   * Calculate matching skills between resume and job description
   */
  calculateMatchingSkills(
    resumeSkills: string[],
    jobSkills: string[]
  ): string[] {
    return resumeSkills.filter((skill) => jobSkills.includes(skill));
  },

  /**
   * Calculate missing skills (in job but not in resume)
   */
  calculateMissingSkills(
    resumeSkills: string[],
    jobSkills: string[]
  ): string[] {
    return jobSkills.filter((skill) => !resumeSkills.includes(skill));
  },

  /**
   * Calculate match score based on skills overlap
   */
  calculateMatchScore(resumeSkills: string[], jobSkills: string[]): number {
    if (jobSkills.length === 0) return 0;

    const matchingSkills = this.calculateMatchingSkills(
      resumeSkills,
      jobSkills
    );
    const score = (matchingSkills.length / jobSkills.length) * 100;
    return Math.min(Math.round(score), 100);
  },
};

// Expose to main thread
expose(extractSkillsWorker);

// For TypeScript
export type AnalysisWorker = typeof extractSkillsWorker;
