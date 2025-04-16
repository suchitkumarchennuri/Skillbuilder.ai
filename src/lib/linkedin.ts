import type { ProfileSuggestion } from '../types';

const CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = `${window.location.origin}/linkedin-callback`;
const LINKEDIN_API_URL = 'https://api.linkedin.com/v2';

interface LinkedInProfile {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  profilePicture?: {
    displayImage: string;
  };
  headline?: string;
  summary?: string;
  positions: {
    total: number;
    elements: Array<{
      title: string;
      companyName: string;
      startDate: { year: number; month: number };
      endDate?: { year: number; month: number };
      description?: string;
    }>;
  };
  skills: {
    total: number;
    elements: Array<{
      name: string;
      endorsements?: number;
    }>;
  };
}

class LinkedInAPI {
  private static instance: LinkedInAPI;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;
  private initialized: boolean = false;

  private constructor() {
    if (CLIENT_ID && CLIENT_SECRET) {
      this.initialized = true;
      this.loadStoredToken();
    }
  }

  private loadStoredToken() {
    try {
      const tokenData = localStorage.getItem('linkedin_token_data');
      if (tokenData) {
        const { token, expiry } = JSON.parse(tokenData);
        if (expiry > Date.now()) {
          this.accessToken = token;
          this.tokenExpiry = expiry;
        } else {
          this.clearToken();
        }
      }
    } catch (error) {
      console.error('Error loading LinkedIn token:', error);
      this.clearToken();
    }
  }

  private clearToken() {
    this.accessToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem('linkedin_token_data');
    localStorage.removeItem('linkedin_state');
  }

  static getInstance(): LinkedInAPI {
    if (!LinkedInAPI.instance) {
      LinkedInAPI.instance = new LinkedInAPI();
    }
    return LinkedInAPI.instance;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isAuthenticated(): boolean {
    return this.initialized && !!(this.accessToken && this.tokenExpiry && this.tokenExpiry > Date.now());
  }

  getAuthUrl(): string {
    if (!this.initialized) {
      throw new Error('LinkedIn API is not properly configured');
    }

    const state = crypto.randomUUID();
    localStorage.setItem('linkedin_state', state);
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID!,
      redirect_uri: REDIRECT_URI,
      state: state,
      scope: 'r_liteprofile r_emailaddress w_member_social',
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('LinkedIn API is not properly configured');
    }

    const savedState = localStorage.getItem('linkedin_state');
    if (!savedState || savedState !== state) {
      throw new Error('Invalid state parameter');
    }
    localStorage.removeItem('linkedin_state');

    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID!,
        client_secret: CLIENT_SECRET!,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to get access token: ${error}`);
    }

    const data = await tokenResponse.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);

    localStorage.setItem('linkedin_token_data', JSON.stringify({
      token: this.accessToken,
      expiry: this.tokenExpiry,
    }));
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.initialized) {
      throw new Error('LinkedIn API is not properly configured');
    }

    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with LinkedIn');
    }

    const response = await fetch(`${LINKEDIN_API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        throw new Error('LinkedIn session expired. Please authenticate again.');
      }
      throw new Error(`LinkedIn API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getProfile(profileId: string): Promise<LinkedInProfile> {
    const fields = [
      'id',
      'localizedFirstName',
      'localizedLastName',
      'profilePicture',
      'headline',
      'summary',
      'positions',
      'skills',
    ].join(',');

    return this.fetchWithAuth(`/me?projection=(${fields})`);
  }

  async analyzeProfile(profile: LinkedInProfile): Promise<{
    score: number;
    suggestions: ProfileSuggestion[];
  }> {
    let score = 0;
    const suggestions: ProfileSuggestion[] = [];

    // Profile completeness check
    if (profile.profilePicture?.displayImage) score += 10;
    else {
      suggestions.push({
        section: 'profile',
        suggestion: 'Add a professional profile picture to increase visibility',
        priority: 'high',
      });
    }

    if (profile.headline) score += 10;
    else {
      suggestions.push({
        section: 'profile',
        suggestion: 'Add a compelling headline that showcases your expertise',
        priority: 'high',
      });
    }

    if (profile.summary) score += 15;
    else {
      suggestions.push({
        section: 'profile',
        suggestion: 'Write a comprehensive summary highlighting your achievements and goals',
        priority: 'high',
      });
    }

    // Experience analysis
    const positions = profile.positions?.elements || [];
    if (positions.length > 0) {
      score += Math.min(positions.length * 5, 20);
      
      positions.forEach(position => {
        if (!position.description) {
          suggestions.push({
            section: 'experience',
            suggestion: `Add detailed description for your role at ${position.companyName}`,
            priority: 'medium',
          });
        }
      });
    } else {
      suggestions.push({
        section: 'experience',
        suggestion: 'Add your work experience to strengthen your profile',
        priority: 'high',
      });
    }

    // Skills analysis
    const skills = profile.skills?.elements || [];
    if (skills.length > 0) {
      score += Math.min(skills.length * 2, 15);
      
      const lowEndorsedSkills = skills.filter(skill => 
        !skill.endorsements || skill.endorsements < 5
      );

      if (lowEndorsedSkills.length > 0) {
        suggestions.push({
          section: 'network',
          suggestion: 'Request endorsements for your key skills to increase credibility',
          priority: 'medium',
        });
      }
    } else {
      suggestions.push({
        section: 'profile',
        suggestion: 'Add relevant skills to your profile to improve searchability',
        priority: 'high',
      });
    }

    // Network engagement
    if (skills.some(skill => skill.endorsements && skill.endorsements > 10)) {
      score += 15;
    } else {
      suggestions.push({
        section: 'network',
        suggestion: 'Engage with your network to increase skill endorsements',
        priority: 'medium',
      });
    }

    return {
      score: Math.min(score, 100),
      suggestions,
    };
  }

  logout(): void {
    this.clearToken();
  }
}

export const linkedInApi = LinkedInAPI.getInstance();