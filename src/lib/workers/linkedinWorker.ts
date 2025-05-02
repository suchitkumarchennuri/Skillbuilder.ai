import { expose } from "comlink";
import type { ProfileSuggestion } from "../../types";

// Define section types for suggestions
export type SuggestionSection =
  | "profile"
  | "experience"
  | "network"
  | "skills"
  | "education";

// Cache for repeated operations
const profileCache = new Map<
  string,
  {
    data: any;
    timestamp: number;
  }
>();

const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days cache

/**
 * Worker for LinkedIn profile analysis to off-load processing from the main thread
 */
const linkedinWorker = {
  /**
   * Extract experiences data from profile
   */
  extractExperiences(profileData: any): any[] {
    if (
      !profileData ||
      !profileData.experiences ||
      !Array.isArray(profileData.experiences)
    ) {
      return [];
    }

    return profileData.experiences.map((exp: any) => ({
      title: exp.title || "",
      company: exp.company_name || "",
      description: exp.description || "",
      date_range: exp.date_range || "",
      duration: exp.duration || "",
      location: exp.location || "",
    }));
  },

  /**
   * Extract education data from profile
   */
  extractEducation(profileData: any): any[] {
    if (
      !profileData ||
      !profileData.education ||
      !Array.isArray(profileData.education)
    ) {
      return [];
    }

    return profileData.education.map((edu: any) => ({
      school: edu.school || "",
      degree: edu.degree || "",
      field_of_study: edu.field_of_study || "",
      date_range: edu.date_range || "",
    }));
  },

  /**
   * Extract skills from profile data
   */
  extractSkills(profileData: any): string[] {
    if (!profileData || !profileData.skills) {
      return [];
    }

    if (Array.isArray(profileData.skills)) {
      return profileData.skills
        .map((skill: any) => {
          if (typeof skill === "string") {
            return skill;
          } else if (skill && skill.name) {
            return skill.name;
          }
          return "";
        })
        .filter(Boolean);
    }

    return [];
  },

  /**
   * Generate a cleaned profile summary for analysis
   */
  generateProfileSummary(profileData: any): string {
    if (!profileData) {
      return "";
    }

    const name = profileData.full_name || "";
    const headline = profileData.headline || "";
    const summary = profileData.summary || "";
    const skills = this.extractSkills(profileData);
    const experiences = this.extractExperiences(profileData);
    const education = this.extractEducation(profileData);

    // Generate a cleaned profile summary
    let profileSummary = `Name: ${name}\n`;
    profileSummary += `Headline: ${headline}\n\n`;

    if (summary) {
      profileSummary += `Summary:\n${summary}\n\n`;
    }

    if (skills.length > 0) {
      profileSummary += `Skills: ${skills.join(", ")}\n\n`;
    }

    if (experiences.length > 0) {
      profileSummary += `Experience:\n`;
      experiences.forEach((exp) => {
        profileSummary += `- ${exp.title} at ${exp.company} (${exp.date_range})\n`;
        if (exp.description) {
          profileSummary += `  ${exp.description.substring(0, 200)}${
            exp.description.length > 200 ? "..." : ""
          }\n`;
        }
      });
      profileSummary += "\n";
    }

    if (education.length > 0) {
      profileSummary += `Education:\n`;
      education.forEach((edu) => {
        profileSummary += `- ${edu.degree || ""} ${
          edu.field_of_study ? "in " + edu.field_of_study : ""
        } at ${edu.school} (${edu.date_range})\n`;
      });
    }

    return profileSummary;
  },

  /**
   * Calculate a simple profile completeness score
   */
  calculateInitialScore(profileData: any): number {
    let score = 0;

    // Basic profile elements
    if (profileData.profile_pic_url) score += 5;
    if (profileData.full_name) score += 5;
    if (profileData.headline) score += 10;
    if (profileData.summary) score += 15;

    // Skills
    const skills = this.extractSkills(profileData);
    score += Math.min(skills.length * 2, 20); // Max 20 points for skills

    // Experience
    const experiences = this.extractExperiences(profileData);
    score += Math.min(experiences.length * 5, 25); // Max 25 points for experience

    // Education
    const education = this.extractEducation(profileData);
    score += Math.min(education.length * 5, 10); // Max 10 points for education

    // Experience details
    experiences.forEach((exp) => {
      if (exp.description && exp.description.length > 50) score += 2;
    });

    // Cap at 90 as the AI analysis should add final points
    return Math.min(score, 90);
  },

  /**
   * Parse profile data and extract the most relevant information
   */
  parseProfileData(profileData: any): any {
    const cacheKey = `profile:${JSON.stringify(profileData).substring(0, 200)}`;

    if (profileCache.has(cacheKey)) {
      const cached = profileCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
    }

    // Extract the most important data
    const parsedData = {
      full_name: profileData.full_name || "",
      headline: profileData.headline || "",
      summary: profileData.summary || "",
      profile_pic_url: profileData.profile_pic_url || "",
      experiences: this.extractExperiences(profileData),
      education: this.extractEducation(profileData),
      skills: this.extractSkills(profileData),
      profileSummary: this.generateProfileSummary(profileData),
      initialScore: this.calculateInitialScore(profileData),
    };

    // Store in cache
    profileCache.set(cacheKey, {
      data: parsedData,
      timestamp: Date.now(),
    });

    return parsedData;
  },

  /**
   * Generate initial suggestions based on profile completeness
   */
  generateInitialSuggestions(profileData: any): ProfileSuggestion[] {
    const suggestions: ProfileSuggestion[] = [];

    // Profile picture
    if (!profileData.profile_pic_url) {
      suggestions.push({
        section: "profile",
        suggestion: "Add a professional profile picture to enhance credibility",
        priority: "high",
      });
    }

    // Headline
    if (!profileData.headline) {
      suggestions.push({
        section: "profile",
        suggestion:
          "Add a compelling headline that showcases your expertise and value proposition",
        priority: "high",
      });
    } else if (profileData.headline.length < 40) {
      suggestions.push({
        section: "profile",
        suggestion:
          "Enhance your headline with more specific skills and achievements",
        priority: "medium",
      });
    }

    // Summary
    if (!profileData.summary) {
      suggestions.push({
        section: "profile",
        suggestion:
          "Add a professional summary to highlight your key achievements and career goals",
        priority: "high",
      });
    } else if (profileData.summary.length < 200) {
      suggestions.push({
        section: "profile",
        suggestion:
          "Expand your summary to showcase your unique value proposition and career journey",
        priority: "medium",
      });
    }

    // Skills
    const skills = this.extractSkills(profileData);
    if (skills.length < 5) {
      suggestions.push({
        section: "skills",
        suggestion:
          "Add more skills to your profile to improve visibility in searches",
        priority: "high",
      });
    }

    // Experience
    const experiences = this.extractExperiences(profileData);
    if (experiences.length === 0) {
      suggestions.push({
        section: "experience",
        suggestion:
          "Add your work experience to make your profile more complete",
        priority: "high",
      });
    } else {
      // Check for experience descriptions
      const missingDescriptions = experiences.filter(
        (exp) => !exp.description || exp.description.length < 50
      );
      if (missingDescriptions.length > 0) {
        suggestions.push({
          section: "experience",
          suggestion: `Add detailed descriptions to ${missingDescriptions.length} work experience entries`,
          priority: "medium",
        });
      }
    }

    return suggestions;
  },
};

// Expose to main thread
expose(linkedinWorker);

// For TypeScript
export type LinkedInWorker = typeof linkedinWorker;
