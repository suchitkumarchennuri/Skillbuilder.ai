/*
  # Fix Job Market Analytics Schema

  1. Changes
    - Add missing columns for job market analytics
    - Add proper indexes for analytics queries
    - Add triggers for data consistency

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS tr_set_role_category ON job_listings;
DROP TRIGGER IF EXISTS update_job_listings_updated_at ON job_listings;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS set_role_category();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Modify job_listings table
ALTER TABLE job_listings
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS role_category text,
  ADD COLUMN IF NOT EXISTS employment_type text,
  ADD COLUMN IF NOT EXISTS salary_min numeric,
  ADD COLUMN IF NOT EXISTS salary_max numeric,
  ADD COLUMN IF NOT EXISTS salary_currency text,
  ADD COLUMN IF NOT EXISTS salary_period text,
  ADD COLUMN IF NOT EXISTS is_remote boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS posted_date timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create function to set role category based on title
CREATE OR REPLACE FUNCTION set_role_category()
RETURNS TRIGGER AS $$
BEGIN
  NEW.role_category = 
    CASE 
      WHEN NEW.title ~* 'java.*developer' THEN 'Java Developer'
      WHEN NEW.title ~* 'software.*engineer' THEN 'Software Development Engineer'
      WHEN NEW.title ~* 'ai.*engineer' THEN 'AI Engineer'
      WHEN NEW.title ~* 'software.*ai' THEN 'Software AI Engineer'
      WHEN NEW.title ~* 'full.*stack' THEN 'Full Stack Developer'
      WHEN NEW.title ~* 'data.*engineer' THEN 'Data Engineer'
      WHEN NEW.title ~* 'python.*developer' THEN 'Python Developer'
      WHEN NEW.title ~* 'backend.*developer' THEN 'Backend Developer'
      WHEN NEW.title ~* 'mlops.*engineer' THEN 'MLOps Engineer'
      WHEN NEW.title ~* 'frontend.*developer' THEN 'Frontend Developer'
      WHEN NEW.title ~* 'devops.*engineer' THEN 'DevOps Engineer'
      WHEN NEW.title ~* 'cloud.*engineer' THEN 'Cloud Engineer'
      WHEN NEW.title ~* 'security.*engineer' THEN 'Security Engineer'
      ELSE 'Other'
    END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_listings_location ON job_listings(country, state, city);
CREATE INDEX IF NOT EXISTS idx_job_listings_role_category ON job_listings(role_category);
CREATE INDEX IF NOT EXISTS idx_job_listings_posted_date ON job_listings(posted_date);
CREATE INDEX IF NOT EXISTS idx_job_listings_salary ON job_listings(salary_min, salary_max);
CREATE INDEX IF NOT EXISTS idx_job_listings_is_remote ON job_listings(is_remote);
CREATE INDEX IF NOT EXISTS idx_job_listings_analytics ON job_listings(title, role_category, posted_date);

-- Create triggers
CREATE TRIGGER update_job_listings_updated_at
  BEFORE UPDATE ON job_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_set_role_category
  BEFORE INSERT OR UPDATE OF title ON job_listings
  FOR EACH ROW
  EXECUTE FUNCTION set_role_category();