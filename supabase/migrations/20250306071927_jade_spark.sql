/*
  # Job Analytics Integration Schema

  1. New Tables
    - `job_listings`
      - `id` (uuid, primary key)
      - `title` (text)
      - `company` (text)
      - `location` (text)
      - `description` (text)
      - `salary_min` (numeric, nullable)
      - `salary_max` (numeric, nullable)
      - `salary_currency` (text, nullable)
      - `salary_period` (text, nullable)
      - `is_remote` (boolean)
      - `url` (text)
      - `posted_date` (timestamptz)
      - `publisher` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `job_skills`
      - `id` (uuid, primary key)
      - `job_id` (uuid, references job_listings)
      - `skill` (text)
      - `created_at` (timestamptz)
    
    - `job_market_trends`
      - `id` (uuid, primary key)
      - `job_title` (text)
      - `location` (text)
      - `avg_salary_min` (numeric)
      - `avg_salary_max` (numeric)
      - `demand_score` (numeric)
      - `remote_percentage` (numeric)
      - `period_start` (date)
      - `period_end` (date)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read data
    - Add policies for service role to manage data

  3. Indexes
    - Add indexes for frequently queried columns
    - Add composite indexes for analytics queries
*/

-- Job Listings Table
CREATE TABLE IF NOT EXISTS job_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  location text NOT NULL,
  description text,
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  salary_period text,
  is_remote boolean DEFAULT false,
  url text NOT NULL,
  posted_date timestamptz NOT NULL,
  publisher text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Job Skills Table
CREATE TABLE IF NOT EXISTS job_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES job_listings(id) ON DELETE CASCADE,
  skill text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Job Market Trends Table
CREATE TABLE IF NOT EXISTS job_market_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title text NOT NULL,
  location text NOT NULL,
  avg_salary_min numeric NOT NULL,
  avg_salary_max numeric NOT NULL,
  demand_score numeric NOT NULL,
  remote_percentage numeric NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_market_trends ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_listings_posted_date ON job_listings(posted_date);
CREATE INDEX IF NOT EXISTS idx_job_listings_location ON job_listings(location);
CREATE INDEX IF NOT EXISTS idx_job_listings_title ON job_listings(title);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill ON job_skills(skill);
CREATE INDEX IF NOT EXISTS idx_job_market_trends_period ON job_market_trends(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_job_market_trends_location ON job_market_trends(location);
CREATE INDEX IF NOT EXISTS idx_job_market_trends_title ON job_market_trends(job_title);

-- Create composite indexes for analytics
CREATE INDEX IF NOT EXISTS idx_job_listings_analytics ON job_listings(title, location, posted_date);
CREATE INDEX IF NOT EXISTS idx_job_market_trends_analytics ON job_market_trends(job_title, location, period_start);

-- RLS Policies
-- Job Listings policies
CREATE POLICY "Anyone can read job listings"
  ON job_listings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage job listings"
  ON job_listings
  USING (auth.jwt()->>'role' = 'service_role');

-- Job Skills policies
CREATE POLICY "Anyone can read job skills"
  ON job_skills
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage job skills"
  ON job_skills
  USING (auth.jwt()->>'role' = 'service_role');

-- Job Market Trends policies
CREATE POLICY "Anyone can read job market trends"
  ON job_market_trends
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage job market trends"
  ON job_market_trends
  USING (auth.jwt()->>'role' = 'service_role');

-- Functions for analytics
CREATE OR REPLACE FUNCTION calculate_job_market_trends(
  start_date date,
  end_date date
) RETURNS void AS $$
BEGIN
  -- Insert or update job market trends
  INSERT INTO job_market_trends (
    job_title,
    location,
    avg_salary_min,
    avg_salary_max,
    demand_score,
    remote_percentage,
    period_start,
    period_end
  )
  SELECT
    title as job_title,
    location,
    AVG(salary_min) as avg_salary_min,
    AVG(salary_max) as avg_salary_max,
    COUNT(*) * 1.0 / 
      (SELECT COUNT(*) FROM job_listings 
       WHERE posted_date >= start_date 
       AND posted_date < end_date) * 100 as demand_score,
    SUM(CASE WHEN is_remote THEN 1 ELSE 0 END)::numeric / 
      COUNT(*)::numeric * 100 as remote_percentage,
    start_date as period_start,
    end_date as period_end
  FROM job_listings
  WHERE posted_date >= start_date 
    AND posted_date < end_date
  GROUP BY title, location;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update job_listings.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_job_listings_updated_at
  BEFORE UPDATE ON job_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();