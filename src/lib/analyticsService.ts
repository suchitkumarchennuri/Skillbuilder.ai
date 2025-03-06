import { supabase } from './supabase';
import { TECH_ROLES, TECHNICAL_SKILLS } from './constants';
import type { JobMarketTrends } from '../types';

export interface SkillTrend {
  skill: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SalaryTrend {
  jobTitle: string;
  location: string;
  avgMin: number;
  avgMax: number;
  trend: 'up' | 'down' | 'stable';
}

export interface LocationTrend {
  location: string;
  jobCount: number;
  percentage: number;
  avgSalary: number;
}

export interface MarketInsights {
  topSkills: SkillTrend[];
  salaryTrends: SalaryTrend[];
  locationTrends: LocationTrend[];
  remoteWork: {
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
  roleComparison: {
    role: string;
    count: number;
    avgSalary: number;
    demandScore: number;
  }[];
  roleDistribution: {
    role: string;
    count: number;
    percentage: number;
  }[];
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private stateMultipliers: Map<string, number>;

  private constructor() {
    this.stateMultipliers = new Map();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private getRandomTrend(): 'up' | 'down' | 'stable' {
    const trends: Array<'up' | 'down' | 'stable'> = ['up', 'down', 'stable'];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  private getStateMultiplier(state: string): number {
    if (!this.stateMultipliers.has(state)) {
      // Generate a random multiplier between 0.7 and 1.3
      const multiplier = 0.7 + Math.random() * 0.6;
      this.stateMultipliers.set(state, multiplier);
    }
    return this.stateMultipliers.get(state) || 1;
  }

  private getSkillsForRole(role: string): string[] {
    const roleSkillMap: Record<string, string[]> = {
      'Senior Java Developer': [
        'java', 'spring', 'springboot', 'hibernate', 'oracle', 'microservices',
        'kafka', 'junit', 'maven', 'aws', 'docker'
      ],
      'Java Architect': [
        'java', 'spring', 'microservices', 'kafka', 'oracle', 'aws',
        'designpatterns', 'eventdriven', 'cqrs', 'ddd'
      ],
      '.NET Solutions Architect': [
        'csharp', 'dotnet', 'aspnet', 'azure', 'sqlserver', 'microservices',
        'entityframework', 'designpatterns', 'ddd', 'eventdriven'
      ],
      'Senior .NET Developer': [
        'csharp', 'dotnet', 'aspnet', 'entityframework', 'sqlserver',
        'azure', 'blazor', 'webapi', 'microservices', 'xunit'
      ],
      'Enterprise Software Engineer': [
        'java', 'csharp', 'oracle', 'sqlserver', 'microservices',
        'kafka', 'soap', 'rest', 'designpatterns', 'azure'
      ],
      'Full Stack Java Developer': [
        'java', 'spring', 'react', 'typescript', 'oracle',
        'docker', 'aws', 'junit', 'maven', 'rest'
      ],
      'Full Stack .NET Developer': [
        'csharp', 'dotnet', 'aspnet', 'react', 'typescript',
        'sqlserver', 'azure', 'entityframework', 'blazor', 'rest'
      ],
      'Cloud Solutions Architect': [
        'aws', 'azure', 'kubernetes', 'terraform', 'microservices',
        'docker', 'devops', 'python', 'linux', 'kafka'
      ],
      'DevOps Engineer': [
        'jenkins', 'docker', 'kubernetes', 'ansible', 'terraform',
        'aws', 'python', 'linux', 'git', 'monitoring'
      ],
      'Security Engineer': [
        'security', 'oauth', 'jwt', 'cryptography', 'fortify',
        'penetration testing', 'azure', 'aws', 'compliance'
      ],
      'Data Engineer': [
        'python', 'sql', 'spark', 'hadoop', 'kafka',
        'aws', 'databricks', 'snowflake', 'etl'
      ],
      'Frontend Developer': [
        'javascript', 'typescript', 'react', 'angular',
        'html', 'css', 'webpack', 'jest', 'cypress'
      ],
      'Backend Developer': [
        'java', 'csharp', 'python', 'nodejs',
        'sql', 'mongodb', 'redis', 'microservices'
      ]
    };

    return roleSkillMap[role] || Array.from(TECHNICAL_SKILLS).slice(0, 8);
  }

  private generateRandomSalary(role: string, stateMultiplier: number): { min: number; max: number } {
    const baseSalaries: Record<string, { min: number; max: number }> = {
      'Senior Java Developer': { min: 140000, max: 200000 },
      'Java Architect': { min: 160000, max: 220000 },
      '.NET Solutions Architect': { min: 155000, max: 215000 },
      'Senior .NET Developer': { min: 135000, max: 195000 },
      'Enterprise Software Engineer': { min: 145000, max: 205000 },
      'Full Stack Java Developer': { min: 130000, max: 190000 },
      'Full Stack .NET Developer': { min: 125000, max: 185000 },
      'Cloud Solutions Architect': { min: 150000, max: 210000 },
      'DevOps Engineer': { min: 130000, max: 190000 },
      'Security Engineer': { min: 140000, max: 200000 },
      'Data Engineer': { min: 125000, max: 185000 },
      'Frontend Developer': { min: 110000, max: 170000 },
      'Backend Developer': { min: 120000, max: 180000 }
    };

    const base = baseSalaries[role] || { min: 120000, max: 180000 };
    const randomFactor = 0.9 + Math.random() * 0.2;

    return {
      min: Math.round(base.min * stateMultiplier * randomFactor),
      max: Math.round(base.max * stateMultiplier * randomFactor)
    };
  }

  private generateDefaultData(state: string): MarketInsights {
    const stateMultiplier = this.getStateMultiplier(state);
    const selectedRoles = TECH_ROLES.slice(0, 5 + Math.floor(Math.random() * 6));
    const totalJobs = Math.floor(800 + Math.random() * 400) * stateMultiplier;

    // Generate role distribution with salary data
    const roleData = selectedRoles.map(role => {
      const count = Math.floor((totalJobs / selectedRoles.length) * (0.7 + Math.random() * 0.6));
      const salary = this.generateRandomSalary(role, stateMultiplier);
      return {
        role,
        count,
        avgSalary: (salary.min + salary.max) / 2,
        salary
      };
    });

    // Sort roles by average salary to find highest paying
    const sortedBySalary = [...roleData].sort((a, b) => b.avgSalary - a.avgSalary);
    const highestPaying = sortedBySalary[0];

    // Get skills specific to the highest paying role
    const topSkills = this.getSkillsForRole(highestPaying.role).map((skill, index) => ({
      skill,
      count: 100 - (index * 8),
      percentage: 90 - (index * 7),
      trend: this.getRandomTrend()
    }));

    const totalRoleCount = roleData.reduce((sum, role) => sum + role.count, 0);

    return {
      topSkills,
      salaryTrends: roleData.map(({ role, salary }) => ({
        jobTitle: role,
        location: state,
        avgMin: salary.min,
        avgMax: salary.max,
        trend: this.getRandomTrend()
      })),
      locationTrends: [{
        location: state,
        jobCount: totalJobs,
        percentage: 100,
        avgSalary: roleData.reduce((sum, role) => sum + role.avgSalary, 0) / roleData.length
      }],
      remoteWork: {
        percentage: 40 + Math.random() * 35,
        trend: this.getRandomTrend()
      },
      roleComparison: roleData.map(({ role, count, avgSalary }) => ({
        role,
        count,
        avgSalary,
        demandScore: (count / totalRoleCount) * 100
      })),
      roleDistribution: roleData.map(({ role, count }) => ({
        role,
        count,
        percentage: (count / totalRoleCount) * 100
      }))
    };
  }

  async getMarketInsights(state: string): Promise<MarketInsights> {
    try {
      return this.generateDefaultData(state);
    } catch (error) {
      console.error('Error fetching market insights:', error);
      return this.generateDefaultData(state);
    }
  }
}

export const analyticsService = AnalyticsService.getInstance();