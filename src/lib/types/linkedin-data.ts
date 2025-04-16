/**
 * Core Profile Information
 * ----------------------
 * - User ID (unique identifier)
 * - First Name (localized)
 * - Last Name (localized)
 * - Headline (optional)
 * - Professional Summary (optional)
 * 
 * Work Experience
 * --------------
 * Each position contains:
 * - Job Title
 * - Company Name
 * - Start Date (year and month)
 * - End Date (year and month, optional for current positions)
 * - Role Description (optional)
 * 
 * Skills & Endorsements
 * --------------------
 * Each skill entry includes:
 * - Skill Name
 * - Number of Endorsements (optional)
 * 
 * Data Structure Types
 */

export interface LinkedInProfileData {
  // Basic Profile Information
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  summary?: string;

  // Professional Experience
  positions: {
    total: number;
    items: Array<{
      title: string;
      company: string;
      startDate: {
        year: number;
        month: number;
      };
      endDate?: {
        year: number;
        month: number;
      };
      description?: string;
    }>;
  };

  // Skills and Expertise
  skills: {
    total: number;
    items: Array<{
      name: string;
      endorsementCount?: number;
    }>;
  };
}

/**
 * Analyzable Metrics
 * -----------------
 * 1. Profile Completeness:
 *    - Presence of headline
 *    - Presence of summary
 *    - Number of filled optional fields
 * 
 * 2. Experience Metrics:
 *    - Total number of positions
 *    - Average duration per position
 *    - Presence of role descriptions
 * 
 * 3. Skills Assessment:
 *    - Total number of skills
 *    - Average endorsements per skill
 *    - Skills with high endorsement counts
 * 
 * 4. Career Progression:
 *    - Timeline of positions
 *    - Role level progression
 *    - Industry changes
 */

export interface ProfileMetrics {
  completeness: {
    score: number;  // 0-100
    missingElements: string[];
  };
  experience: {
    totalYears: number;
    averagePositionDuration: number;  // in months
    positionsWithDescriptions: number;
  };
  skills: {
    totalCount: number;
    averageEndorsements: number;
    topEndorsedSkills: string[];
  };
}