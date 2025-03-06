/*
  # Initial Schema Setup for SkillBridge AI

  1. Tables
    - users
      - Core user information
    - resume_analyses
      - Stores resume analysis results
    - linkedin_analyses
      - LinkedIn profile analysis data
    - job_market_analytics
      - Job market insights and trends
    
  2. Security
    - RLS policies for all tables
    - Authentication setup
    - Data access controls
*/

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Resume Analyses Table
CREATE TABLE IF NOT EXISTS resume_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  resume_text text NOT NULL,
  job_description text NOT NULL,
  matching_skills text[] DEFAULT '{}',
  missing_skills text[] DEFAULT '{}',
  score float NOT NULL,
  suggestions text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- LinkedIn Analyses Table
CREATE TABLE IF NOT EXISTS linkedin_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  profile_url text NOT NULL,
  profile_score float NOT NULL,
  suggestions jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Job Market Analytics Table
CREATE TABLE IF NOT EXISTS job_market_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  job_title text NOT NULL,
  location text NOT NULL,
  demand_score float NOT NULL,
  salary_range jsonb NOT NULL,
  top_skills jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_market_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read own resume analyses"
  ON resume_analyses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own resume analyses"
  ON resume_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own linkedin analyses"
  ON linkedin_analyses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own linkedin analyses"
  ON linkedin_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own job market analytics"
  ON job_market_analytics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own job market analytics"
  ON job_market_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);