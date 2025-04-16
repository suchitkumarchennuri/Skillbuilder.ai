import axios from 'axios';
import { z } from 'zod';
import { format } from 'date-fns';
import { supabase } from './supabase';
import { LOCATIONS, TECH_ROLES } from './constants';

const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'jsearch.p.rapidapi.com';

if (!RAPIDAPI_KEY) {
  throw new Error('Missing required API configuration');
}

// Schema for job listings from the JSearch API
const jobListingSchema = z.object({
  job_id: z.string(),
  employer_name: z.string(),
  employer_logo: z.string().nullable().optional(),
  employer_website: z.string().nullable().optional(),
  job_title: z.string(),
  job_description: z.string(),
  job_country: z.string().optional(),
  job_employment_type: z.string().optional(),
  job_city: z.string().nullable().optional(),
  job_state: z.string().nullable().optional(),
  job_posted_at_datetime_utc: z.string().optional(),
  job_apply_link: z.string(),
  job_min_salary: z.number().nullable().optional(),
  job_max_salary: z.number().nullable().optional(),
  job_salary_currency: z.string().nullable().optional(),
  job_salary_period: z.string().nullable().optional(),
  job_is_remote: z.boolean().optional(),
  job_highlights: z.object({
    Qualifications: z.array(z.string()).optional(),
    Responsibilities: z.array(z.string()).optional(),
    Benefits: z.array(z.string()).optional(),
  }).optional(),
}).transform(data => ({
  id: data.job_id,
  title: data.job_title,
  company: data.employer_name,
  location: data.job_is_remote ? 'Remote' :
    [data.job_city, data.job_state, data.job_country]
      .filter(Boolean)
      .join(', ') || 'Location not specified',
  description: data.job_description,
  salary: data.job_min_salary && data.job_max_salary
    ? `${data.job_salary_currency || 'USD'} ${data.job_min_salary.toLocaleString()} - ${data.job_max_salary.toLocaleString()} ${data.job_salary_period?.toLowerCase() || 'per year'}`
    : 'Salary not specified',
  posted_date: data.job_posted_at_datetime_utc 
    ? format(new Date(data.job_posted_at_datetime_utc), 'MMM d, yyyy')
    : 'Recently posted',
  url: data.job_apply_link,
  category: data.job_employment_type || 'Full Time',
  isRemote: data.job_is_remote || false,
  highlights: {
    qualifications: data.job_highlights?.Qualifications || [],
    responsibilities: data.job_highlights?.Responsibilities || [],
    benefits: data.job_highlights?.Benefits || [],
  },
  raw: {
    title: data.job_title,
    country: data.job_country,
    state: data.job_state,
    city: data.job_city,
    employment_type: data.job_employment_type,
    salary_min: data.job_min_salary,
    salary_max: data.job_max_salary,
    salary_currency: data.job_salary_currency,
    salary_period: data.job_salary_period,
    is_remote: data.job_is_remote,
    posted_date: data.job_posted_at_datetime_utc,
    qualifications: data.job_highlights?.Qualifications || []
  }
}));

export type JobListing = z.infer<typeof jobListingSchema>;

const jobListingsResponseSchema = z.object({
  status: z.string(),
  data: z.array(z.unknown()),
}).transform(data => {
  const listings: JobListing[] = [];
  
  for (const item of data.data) {
    try {
      const validated = jobListingSchema.parse(item);
      listings.push(validated);
    } catch (error) {
      console.warn('Failed to validate job listing:', error);
      continue;
    }
  }
  
  return {
    listings,
    total: listings.length
  };
});

export interface JobSearchParams {
  location?: string;
  category?: string;
  keywords?: string;
  page?: number;
  remote?: boolean;
}

class JobsAPI {
  private static instance: JobsAPI;
  private cache: Map<string, { data: { listings: JobListing[]; total: number }; timestamp: number }>;
  private readonly cacheDuration = 1000 * 60 * 15; // 15 minutes
  private pendingRequests: Map<string, Promise<{ listings: JobListing[]; total: number }>>;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  private constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  static getInstance(): JobsAPI {
    if (!JobsAPI.instance) {
      JobsAPI.instance = new JobsAPI();
    }
    return JobsAPI.instance;
  }

  private getCacheKey(params: JobSearchParams): string {
    return JSON.stringify(params);
  }

  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheDuration;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async storeJobData(job: JobListing) {
    try {
      // Store job listing
      const { data: jobData, error: jobError } = await supabase
        .from('job_listings')
        .upsert({
          id: job.id,
          title: job.raw.title,
          company: job.company,
          country: job.raw.country,
          state: job.raw.state,
          city: job.raw.city,
          employment_type: job.raw.employment_type,
          salary_min: job.raw.salary_min,
          salary_max: job.raw.salary_max,
          salary_currency: job.raw.salary_currency,
          salary_period: job.raw.salary_period,
          is_remote: job.raw.is_remote,
          posted_date: job.raw.posted_date ? new Date(job.raw.posted_date) : new Date(),
          url: job.url,
          description: job.description
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Store qualifications
      if (job.raw.qualifications.length > 0) {
        const { error: qualError } = await supabase
          .from('job_qualifications')
          .upsert(
            job.raw.qualifications.map(qual => ({
              job_id: job.id,
              qualification: qual
            }))
          );

        if (qualError) throw qualError;
      }

      return jobData;
    } catch (error) {
      console.error('Error storing job data:', error);
      throw error;
    }
  }

  async populateHistoricalData() {
    try {
      // Fetch data for each role and location combination
      for (const country of Object.keys(LOCATIONS)) {
        for (const state of LOCATIONS[country as keyof typeof LOCATIONS]) {
          for (const role of TECH_ROLES) {
            console.log(`Fetching data for ${role} in ${state}, ${country}...`);
            
            const query = `${role} in ${state}, ${country}`;
            
            const response = await axios.request({
              method: 'GET',
              url: 'https://jsearch.p.rapidapi.com/search',
              params: {
                query,
                page: '1',
                num_pages: '1',
                date_posted: 'all'
              },
              headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
              }
            });

            const validatedData = jobListingsResponseSchema.parse(response.data);
            
            // Store job data
            await Promise.all(validatedData.listings.map(job => this.storeJobData(job)));
            
            // Respect API rate limits
            await this.delay(1000);
          }
        }
      }

      console.log('Historical data population completed');
    } catch (error) {
      console.error('Error populating historical data:', error);
      throw error;
    }
  }

  async searchJobs(params: JobSearchParams): Promise<{ listings: JobListing[]; total: number }> {
    const cacheKey = this.getCacheKey(params);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCache(cached.timestamp)) {
      return cached.data;
    }

    // Check if there's already a pending request
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Create new request
    const request = this.fetchJobs(params);
    this.pendingRequests.set(cacheKey, request);

    try {
      const data = await request;
      return data;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async fetchJobs(
    params: JobSearchParams,
    attempt: number = 1
  ): Promise<{ listings: JobListing[]; total: number }> {
    try {
      // Build query components
      const queryParts = [];

      // Add keywords
      if (params.keywords) {
        queryParts.push(params.keywords);
      }

      // Add category
      if (params.category) {
        queryParts.push(params.category);
      }

      // Handle location and remote
      if (params.location?.toLowerCase() === 'remote' || params.remote) {
        queryParts.push('remote');
      } else if (params.location) {
        queryParts.push(`in ${params.location}`);
      }

      // Build final query string
      const query = queryParts.join(' ').trim();

      const response = await axios.request({
        method: 'GET',
        url: 'https://jsearch.p.rapidapi.com/search',
        params: {
          query,
          page: '1',
          num_pages: '1',
          date_posted: 'all'
        },
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST
        },
        timeout: 15000
      });

      const validatedData = jobListingsResponseSchema.parse(response.data);
      
      // Store job data in the database
      await Promise.all(validatedData.listings.map(job => this.storeJobData(job)));

      const results = {
        listings: validatedData.listings,
        total: validatedData.listings.length
      };

      // Cache successful response
      const cacheKey = this.getCacheKey(params);
      this.cache.set(cacheKey, {
        data: results,
        timestamp: Date.now()
      });

      return results;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Data validation error:', error.errors);
        return { listings: [], total: 0 };
      }
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' && attempt <= this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
          return this.fetchJobs(params, attempt + 1);
        }

        if (error.response?.status === 429 && attempt <= this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
          return this.fetchJobs(params, attempt + 1);
        }

        throw new Error(error.response?.data?.message || 'Failed to fetch jobs');
      }
      
      if (attempt <= this.maxRetries) {
        await this.delay(this.retryDelay * attempt);
        return this.fetchJobs(params, attempt + 1);
      }
      
      throw new Error('An unexpected error occurred while fetching jobs');
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

export const jobsApi = JobsAPI.getInstance();