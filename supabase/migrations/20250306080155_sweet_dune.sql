/*
  # Fix Job Listings Schema

  1. Changes
    - Add missing columns for job listings
    - Update indexes for better query performance
    - Add location column for geographic filtering
    - Add role_category for job type classification

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS tr_set_role_category ON job_listings;
DROP TRIGGER IF EXISTS update_job_listings_updated_at ON job_listings;

-- Drop existing function if it exists
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
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS role_category text,
  ADD COLUMN IF NOT EXISTS publisher text,
  ADD COLUMN IF NOT EXISTS posted_date timestamptz,
  ADD COLUMN IF NOT EXISTS salary_currency text,
  ADD COLUMN IF NOT EXISTS salary_period text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS company text;

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
CREATE INDEX IF NOT EXISTS idx_job_listings_location ON job_listings(location);
CREATE INDEX IF NOT EXISTS idx_job_listings_role_category ON job_listings(role_category);
CREATE INDEX IF NOT EXISTS idx_job_listings_posted_date ON job_listings(posted_date);
CREATE INDEX IF NOT EXISTS idx_job_listings_analytics ON job_listings(title, location, posted_date);

-- Create triggers
CREATE TRIGGER update_job_listings_updated_at
  BEFORE UPDATE ON job_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_set_role_category
  BEFORE INSERT OR UPDATE OF title ON job_listings
  FOR EACH ROW
  EXECUTE FUNCTION set_role_category();