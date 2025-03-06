// User Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

// Resume Analysis Types
export interface ResumeAnalysis {
  id: string;
  userId: string;
  resumeText: string;
  jobDescription: string;
  matchingSkills: string[];
  missingSkills: string[];
  score: number;
  suggestions: string[];
  createdAt: string;
}

// LinkedIn Analysis Types
export interface LinkedInAnalysis {
  id: string;
  userId: string;
  profileUrl: string;
  profileScore: number;
  suggestions: ProfileSuggestion[];
  createdAt: string;
}

export interface ProfileSuggestion {
  section: 'profile' | 'experience' | 'network';
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

// Job Market Analytics Types
export interface JobMarketAnalytics {
  id: string;
  userId: string;
  jobTitle: string;
  location: string;
  demandScore: number;
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  topSkills: {
    skill: string;
    demandPercentage: number;
  }[];
  createdAt: string;
}