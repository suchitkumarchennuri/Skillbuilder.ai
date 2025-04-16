import { supabase } from "./supabase";
import { TECH_ROLES, TECHNICAL_SKILLS } from "./constants";

export interface SkillTrend {
  skill: string;
  count: number;
  percentage: number;
  trend: "up" | "down" | "stable";
}

export interface SalaryTrend {
  jobTitle: string;
  location: string;
  avgMin: number;
  avgMax: number;
  trend: "up" | "down" | "stable";
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
    trend: "up" | "down" | "stable";
  };
  roleComparison: {
    role: string;
    count: number;
    avgSalary: number;
    demandScore: number;
    growthRate: number;
    competitionLevel: "low" | "medium" | "high";
    marketSentiment: "positive" | "neutral" | "negative";
  }[];
  roleDistribution: {
    role: string;
    count: number;
    percentage: number;
  }[];
  industryTrends: {
    industry: string;
    jobCount: number;
    growthRate: number;
    avgSalary: number;
  }[];
  skillGaps: {
    skill: string;
    demandScore: number;
    supplyScore: number;
    gapScore: number;
  }[];
  compensationInsights: {
    level: string;
    avgTotal: number;
    avgBase: number;
    avgBonus: number;
    avgEquity: number;
    percentileData: {
      p25: number;
      p50: number;
      p75: number;
      p90: number;
    };
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

  private getRandomTrend(): "up" | "down" | "stable" {
    const trends: Array<"up" | "down" | "stable"> = ["up", "down", "stable"];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  private getStateMultiplier(state: string): number {
    if (!this.stateMultipliers.has(state)) {
      const multiplier = 0.7 + Math.random() * 0.6;
      this.stateMultipliers.set(state, multiplier);
    }
    return this.stateMultipliers.get(state) || 1;
  }

  private getSkillsForRole(role: string): string[] {
    const roleSkillMap: Record<string, string[]> = {
      "Senior Java Developer": [
        "java",
        "spring",
        "springboot",
        "hibernate",
        "oracle",
        "microservices",
        "kafka",
        "junit",
        "maven",
        "aws",
        "docker",
      ],
      "Java Architect": [
        "java",
        "spring",
        "microservices",
        "kafka",
        "oracle",
        "aws",
        "designpatterns",
        "eventdriven",
        "cqrs",
        "ddd",
      ],
      ".NET Solutions Architect": [
        "csharp",
        "dotnet",
        "aspnet",
        "azure",
        "sqlserver",
        "microservices",
        "entityframework",
        "designpatterns",
        "ddd",
        "eventdriven",
      ],
      "Senior .NET Developer": [
        "csharp",
        "dotnet",
        "aspnet",
        "entityframework",
        "sqlserver",
        "azure",
        "blazor",
        "webapi",
        "microservices",
        "xunit",
      ],
      "Enterprise Software Engineer": [
        "java",
        "csharp",
        "oracle",
        "sqlserver",
        "microservices",
        "kafka",
        "soap",
        "rest",
        "designpatterns",
        "azure",
      ],
      "Full Stack Java Developer": [
        "java",
        "spring",
        "react",
        "typescript",
        "oracle",
        "docker",
        "aws",
        "junit",
        "maven",
        "rest",
      ],
      "Full Stack .NET Developer": [
        "csharp",
        "dotnet",
        "aspnet",
        "react",
        "typescript",
        "sqlserver",
        "azure",
        "entityframework",
        "blazor",
        "rest",
      ],
      "Cloud Solutions Architect": [
        "aws",
        "azure",
        "kubernetes",
        "terraform",
        "microservices",
        "docker",
        "devops",
        "python",
        "linux",
        "kafka",
      ],
      "DevOps Engineer": [
        "jenkins",
        "docker",
        "kubernetes",
        "ansible",
        "terraform",
        "aws",
        "python",
        "linux",
        "git",
        "monitoring",
      ],
      "Security Engineer": [
        "security",
        "oauth",
        "jwt",
        "cryptography",
        "fortify",
        "penetration testing",
        "azure",
        "aws",
        "compliance",
      ],
      "Data Engineer": [
        "python",
        "sql",
        "spark",
        "hadoop",
        "kafka",
        "aws",
        "databricks",
        "snowflake",
        "etl",
      ],
      "Frontend Developer": [
        "javascript",
        "typescript",
        "react",
        "angular",
        "html",
        "css",
        "webpack",
        "jest",
        "cypress",
      ],
      "Backend Developer": [
        "java",
        "csharp",
        "python",
        "nodejs",
        "sql",
        "mongodb",
        "redis",
        "microservices",
      ],
    };

    return roleSkillMap[role] || Array.from(TECHNICAL_SKILLS).slice(0, 8);
  }

  private generateRandomSalary(
    role: string,
    stateMultiplier: number
  ): { min: number; max: number } {
    const baseSalaries: Record<string, { min: number; max: number }> = {
      "Senior Java Developer": { min: 140000, max: 200000 },
      "Java Architect": { min: 160000, max: 220000 },
      ".NET Solutions Architect": { min: 155000, max: 215000 },
      "Senior .NET Developer": { min: 135000, max: 195000 },
      "Enterprise Software Engineer": { min: 145000, max: 205000 },
      "Full Stack Java Developer": { min: 130000, max: 190000 },
      "Full Stack .NET Developer": { min: 125000, max: 185000 },
      "Cloud Solutions Architect": { min: 150000, max: 210000 },
      "DevOps Engineer": { min: 130000, max: 190000 },
      "Security Engineer": { min: 140000, max: 200000 },
      "Data Engineer": { min: 125000, max: 185000 },
      "Frontend Developer": { min: 110000, max: 170000 },
      "Backend Developer": { min: 120000, max: 180000 },
    };

    const base = baseSalaries[role] || { min: 120000, max: 180000 };
    const randomFactor = 0.9 + Math.random() * 0.2;

    return {
      min: Math.round(base.min * stateMultiplier * randomFactor),
      max: Math.round(base.max * stateMultiplier * randomFactor),
    };
  }

  private generateCompensationInsights(
    role: string,
    avgSalary: number
  ): {
    level: string;
    avgTotal: number;
    avgBase: number;
    avgBonus: number;
    avgEquity: number;
    percentileData: {
      p25: number;
      p50: number;
      p75: number;
      p90: number;
    };
  }[] {
    const levels = [
      "Entry Level",
      "Mid Level",
      "Senior Level",
      "Lead/Principal",
    ];
    const multipliers = [0.6, 0.8, 1.0, 1.3];

    return levels.map((level, index) => {
      const baseMultiplier = multipliers[index];
      const totalComp = avgSalary * baseMultiplier;

      return {
        level,
        avgTotal: Math.round(totalComp),
        avgBase: Math.round(totalComp * 0.7),
        avgBonus: Math.round(totalComp * 0.1),
        avgEquity: Math.round(totalComp * 0.2),
        percentileData: {
          p25: Math.round(totalComp * 0.85),
          p50: Math.round(totalComp),
          p75: Math.round(totalComp * 1.15),
          p90: Math.round(totalComp * 1.3),
        },
      };
    });
  }

  private generateSkillGaps(role: string): {
    skill: string;
    demandScore: number;
    supplyScore: number;
    gapScore: number;
  }[] {
    const skills = this.getSkillsForRole(role);
    return skills.map((skill) => {
      const demandScore = 50 + Math.random() * 50;
      const supplyScore = 40 + Math.random() * 40;
      return {
        skill,
        demandScore: Math.round(demandScore),
        supplyScore: Math.round(supplyScore),
        gapScore: Math.round(demandScore - supplyScore),
      };
    });
  }

  private generateIndustryTrends(role: string): {
    industry: string;
    jobCount: number;
    growthRate: number;
    avgSalary: number;
  }[] {
    const industries = [
      "Technology",
      "Financial Services",
      "Healthcare",
      "E-commerce",
      "Manufacturing",
      "Consulting",
    ];

    return industries.map((industry) => ({
      industry,
      jobCount: Math.floor(100 + Math.random() * 900),
      growthRate: Math.round((5 + Math.random() * 25) * 10) / 10,
      avgSalary: Math.round(120000 + Math.random() * 80000),
    }));
  }

  async getMarketInsights(
    state: string,
    selectedRole: string
  ): Promise<MarketInsights> {
    try {
      const stateMultiplier = this.getStateMultiplier(state);
      const selectedRoles = TECH_ROLES.slice(
        0,
        5 + Math.floor(Math.random() * 6)
      );
      const totalJobs = Math.floor(800 + Math.random() * 400) * stateMultiplier;

      // Generate role distribution with salary data
      const roleData = selectedRoles.map((role) => {
        const count = Math.floor(
          (totalJobs / selectedRoles.length) * (0.7 + Math.random() * 0.6)
        );
        const salary = this.generateRandomSalary(role, stateMultiplier);
        const avgSalary = (salary.min + salary.max) / 2;

        return {
          role,
          count,
          avgSalary,
          demandScore: Math.round((count / totalJobs) * 100),
          growthRate: Math.round((5 + Math.random() * 25) * 10) / 10,
          competitionLevel:
            Math.random() > 0.6
              ? "high"
              : Math.random() > 0.3
              ? "medium"
              : "low",
          marketSentiment:
            Math.random() > 0.6
              ? "positive"
              : Math.random() > 0.3
              ? "neutral"
              : "negative",
          salary,
        };
      });

      // Sort roles by average salary to find highest paying
      const sortedBySalary = [...roleData].sort(
        (a, b) => b.avgSalary - a.avgSalary
      );
      const highestPaying = sortedBySalary[0];

      // Get skills specific to the selected role
      const topSkills = this.getSkillsForRole(selectedRole).map(
        (skill, index) => ({
          skill,
          count: 100 - index * 8,
          percentage: 90 - index * 7,
          trend: this.getRandomTrend(),
        })
      );

      const totalRoleCount = roleData.reduce(
        (sum, role) => sum + role.count,
        0
      );

      return {
        topSkills,
        salaryTrends: roleData.map(({ role, salary }) => ({
          jobTitle: role,
          location: state,
          avgMin: salary.min,
          avgMax: salary.max,
          trend: this.getRandomTrend(),
        })),
        locationTrends: [
          {
            location: state,
            jobCount: totalJobs,
            percentage: 100,
            avgSalary:
              roleData.reduce((sum, role) => sum + role.avgSalary, 0) /
              roleData.length,
          },
        ],
        remoteWork: {
          percentage: 40 + Math.random() * 35,
          trend: this.getRandomTrend(),
        },
        roleComparison: roleData.map(({ role, count, avgSalary }) => ({
          role,
          count,
          avgSalary,
          demandScore: (count / totalJobs) * 100,
          growthRate: 5 + Math.random() * 15,
          competitionLevel: ["low", "medium", "high"][
            Math.floor(Math.random() * 3)
          ] as "low" | "medium" | "high",
          marketSentiment: ["positive", "neutral", "negative"][
            Math.floor(Math.random() * 3)
          ] as "positive" | "neutral" | "negative",
        })),
        roleDistribution: roleData.map(({ role, count }) => ({
          role,
          count,
          percentage: (count / totalRoleCount) * 100,
        })),
        industryTrends: this.generateIndustryTrends(selectedRole),
        skillGaps: this.generateSkillGaps(selectedRole),
        compensationInsights: this.generateCompensationInsights(
          selectedRole,
          roleData.find((r) => r.role === selectedRole)?.avgSalary || 150000
        ),
      };
    } catch (error) {
      console.error("Error fetching market insights:", error);
      return this.generateDefaultData(state);
    }
  }

  private generateDefaultData(state: string): MarketInsights {
    const stateMultiplier = this.getStateMultiplier(state);
    const selectedRoles = TECH_ROLES.slice(0, 5);
    const totalJobs = Math.floor(500 + Math.random() * 200) * stateMultiplier;

    const roleData = selectedRoles.map((role) => {
      const count = Math.floor(
        (totalJobs / selectedRoles.length) * (0.7 + Math.random() * 0.6)
      );
      const salary = this.generateRandomSalary(role, stateMultiplier);
      return {
        role,
        count,
        avgSalary: (salary.min + salary.max) / 2,
        salary,
      };
    });

    const totalRoleCount = roleData.reduce((sum, role) => sum + role.count, 0);

    // Generate location trends for all states for the map
    const allStates = [
      "Alabama",
      "Alaska",
      "Arizona",
      "Arkansas",
      "California",
      "Colorado",
      "Connecticut",
      "Delaware",
      "Florida",
      "Georgia",
      "Hawaii",
      "Idaho",
      "Illinois",
      "Indiana",
      "Iowa",
      "Kansas",
      "Kentucky",
      "Louisiana",
      "Maine",
      "Maryland",
      "Massachusetts",
      "Michigan",
      "Minnesota",
      "Mississippi",
      "Missouri",
      "Montana",
      "Nebraska",
      "Nevada",
      "New Hampshire",
      "New Jersey",
      "New Mexico",
      "New York",
      "North Carolina",
      "North Dakota",
      "Ohio",
      "Oklahoma",
      "Oregon",
      "Pennsylvania",
      "Rhode Island",
      "South Carolina",
      "South Dakota",
      "Tennessee",
      "Texas",
      "Utah",
      "Vermont",
      "Virginia",
      "Washington",
      "West Virginia",
      "Wisconsin",
      "Wyoming",
    ];

    // Define tech industry weightings for different regions
    const regionWeights = {
      west: 1.4, // West coast tech premium
      northeast: 1.2, // Northeast corridor
      midwest: 0.9, // Midwest
      south: 1.0, // South
      mountain: 1.1, // Mountain states
    };

    // Assign regions to states
    const stateRegions: Record<string, string> = {
      California: "west",
      Washington: "west",
      Oregon: "west",
      Nevada: "west",
      Arizona: "west",
      "New York": "northeast",
      Massachusetts: "northeast",
      Connecticut: "northeast",
      "New Jersey": "northeast",
      Pennsylvania: "northeast",
      "Rhode Island": "northeast",
      Vermont: "northeast",
      "New Hampshire": "northeast",
      Maine: "northeast",
      Illinois: "midwest",
      Ohio: "midwest",
      Michigan: "midwest",
      Indiana: "midwest",
      Wisconsin: "midwest",
      Minnesota: "midwest",
      Iowa: "midwest",
      Missouri: "midwest",
      "North Dakota": "midwest",
      "South Dakota": "midwest",
      Nebraska: "midwest",
      Kansas: "midwest",
      Texas: "south",
      Florida: "south",
      Georgia: "south",
      "North Carolina": "south",
      "South Carolina": "south",
      Virginia: "south",
      Tennessee: "south",
      Alabama: "south",
      Mississippi: "south",
      Arkansas: "south",
      Louisiana: "south",
      Oklahoma: "south",
      Kentucky: "south",
      "West Virginia": "south",
      Maryland: "south",
      Delaware: "south",
      Colorado: "mountain",
      Utah: "mountain",
      Idaho: "mountain",
      Montana: "mountain",
      Wyoming: "mountain",
      "New Mexico": "mountain",
      Alaska: "west",
      Hawaii: "west",
    };

    // Generate more realistic state data with detailed metrics
    const locationTrends = allStates.map((stateName) => {
      const isSelectedState = stateName === state;
      const stateMultiplier = this.getStateMultiplier(stateName);
      const region = stateRegions[stateName] || "midwest";
      const regionMultiplier =
        regionWeights[region as keyof typeof regionWeights] || 1.0;

      // Base job count affected by state and region
      const jobCount = isSelectedState
        ? totalJobs
        : Math.floor(100 + Math.random() * 900) *
          stateMultiplier *
          regionMultiplier;

      // Determine average salary based on region and state multiplier
      const baseSalary = isSelectedState
        ? roleData.reduce((sum, role) => sum + role.avgSalary, 0) /
          roleData.length
        : 80000 + Math.random() * 70000;

      const avgSalary = baseSalary * stateMultiplier * regionMultiplier;

      // Add remote work percentage - higher in tech hub states
      const remotePercentage = Math.floor(
        25 + Math.random() * 35 * regionMultiplier
      );

      // Calculate annual growth rate based on region
      const growthRate = (3 + Math.random() * 12) * regionMultiplier;

      // Generate dominant industries for each state
      const dominantIndustries = this.generateDominantIndustries(
        stateName,
        region
      );

      // Calculate market competitiveness (0-100)
      const competitiveness = Math.floor(
        30 + Math.random() * 70 * regionMultiplier
      );

      return {
        location: stateName,
        jobCount,
        percentage: isSelectedState ? 100 : Math.floor(Math.random() * 80),
        avgSalary,
        remotePercentage,
        growthRate: parseFloat(growthRate.toFixed(1)),
        competitiveness,
        dominantIndustries,
      };
    });

    return {
      topSkills: this.getSkillsForRole(selectedRoles[0]).map(
        (skill, index) => ({
          skill,
          count: 100 - index * 8,
          percentage: 90 - index * 7,
          trend: this.getRandomTrend(),
        })
      ),
      salaryTrends: roleData.map(({ role, salary }) => ({
        jobTitle: role,
        location: state,
        avgMin: salary.min,
        avgMax: salary.max,
        trend: this.getRandomTrend(),
      })),
      locationTrends,
      remoteWork: {
        percentage: 40 + Math.random() * 35,
        trend: this.getRandomTrend(),
      },
      roleComparison: roleData.map(({ role, count, avgSalary }) => ({
        role,
        count,
        avgSalary,
        demandScore: (count / totalJobs) * 100,
        growthRate: 5 + Math.random() * 15,
        competitionLevel: ["low", "medium", "high"][
          Math.floor(Math.random() * 3)
        ] as "low" | "medium" | "high",
        marketSentiment: ["positive", "neutral", "negative"][
          Math.floor(Math.random() * 3)
        ] as "positive" | "neutral" | "negative",
      })),
      roleDistribution: roleData.map(({ role, count }) => ({
        role,
        count,
        percentage: (count / totalRoleCount) * 100,
      })),
      industryTrends: this.generateIndustryTrends(selectedRoles[0]),
      skillGaps: this.generateSkillGaps(selectedRoles[0]),
      compensationInsights: this.generateCompensationInsights(
        selectedRoles[0],
        150000
      ),
    };
  }

  // Helper method to generate dominant industries based on region
  private generateDominantIndustries(state: string, region: string): string[] {
    const industries = {
      tech: [
        "Software",
        "Cloud Computing",
        "Cybersecurity",
        "AI/ML",
        "Fintech",
        "Biotech",
        "Blockchain",
        "IoT",
      ],
      finance: [
        "Banking",
        "Investment",
        "Insurance",
        "Wealth Management",
        "Crypto",
        "Trading",
      ],
      manufacturing: [
        "Automotive",
        "Electronics",
        "Aerospace",
        "Industrial",
        "Consumer Goods",
      ],
      healthcare: [
        "Telehealth",
        "Medical Devices",
        "Pharmaceuticals",
        "Health IT",
        "Biotech",
      ],
      energy: [
        "Renewable Energy",
        "Oil & Gas",
        "Utilities",
        "Clean Tech",
        "Smart Grid",
      ],
      retail: [
        "E-commerce",
        "Retail Tech",
        "Supply Chain",
        "Consumer",
        "Logistics",
      ],
      media: [
        "Digital Media",
        "Entertainment",
        "Gaming",
        "Social Media",
        "Streaming",
      ],
      education: ["EdTech", "Higher Education", "Training", "Certification"],
    };

    // Assign likely industries based on region and state
    let industryWeights: Record<string, number> = {};

    // Base chance for all regions
    industryWeights = {
      tech: 0.4,
      finance: 0.3,
      manufacturing: 0.3,
      healthcare: 0.3,
      energy: 0.25,
      retail: 0.3,
      media: 0.25,
      education: 0.2,
    };

    // Adjust weights based on region
    switch (region) {
      case "west":
        industryWeights.tech = 0.8;
        industryWeights.media = 0.6;
        break;
      case "northeast":
        industryWeights.finance = 0.7;
        industryWeights.healthcare = 0.5;
        break;
      case "midwest":
        industryWeights.manufacturing = 0.7;
        industryWeights.healthcare = 0.4;
        break;
      case "south":
        industryWeights.energy = 0.6;
        industryWeights.healthcare = 0.5;
        break;
      case "mountain":
        industryWeights.tech = 0.6;
        industryWeights.energy = 0.5;
        break;
    }

    // Special cases for specific states
    if (state === "California" || state === "Washington") {
      industryWeights.tech = 0.9;
      industryWeights.media = 0.7;
    } else if (state === "New York") {
      industryWeights.finance = 0.9;
      industryWeights.media = 0.7;
    } else if (state === "Texas") {
      industryWeights.energy = 0.8;
      industryWeights.tech = 0.7;
    } else if (state === "Michigan") {
      industryWeights.manufacturing = 0.9;
    } else if (state === "Massachusetts") {
      industryWeights.tech = 0.8;
      industryWeights.healthcare = 0.8;
      industryWeights.education = 0.7;
    }

    // Pick 2-4 dominant industries based on weights
    const selectedIndustries: string[] = [];
    const industryKeys = Object.keys(industries) as Array<
      keyof typeof industries
    >;

    industryKeys.forEach((key) => {
      if (Math.random() < industryWeights[key]) {
        const industryList = industries[key];
        const randomIndex = Math.floor(Math.random() * industryList.length);
        selectedIndustries.push(industryList[randomIndex]);
      }
    });

    // Ensure we have at least 2 industries
    while (selectedIndustries.length < 2) {
      const randomIndustryType =
        industryKeys[Math.floor(Math.random() * industryKeys.length)];
      const randomIndustry =
        industries[randomIndustryType][
          Math.floor(Math.random() * industries[randomIndustryType].length)
        ];
      if (!selectedIndustries.includes(randomIndustry)) {
        selectedIndustries.push(randomIndustry);
      }
    }

    // Limit to top 4 industries
    return selectedIndustries.slice(0, 4);
  }
}

export const analyticsService = AnalyticsService.getInstance();
