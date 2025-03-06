/*
  # Add job listings columns and indexes

  1. Changes
    - Add new columns to job_listings table
    - Create indexes for efficient querying
    - Add role category function and trigger

  2. Security
    - No changes to existing RLS policies
*/

-- Add new columns to job_listings 
ALTER TABLE job_listings 
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS role_category text,
  ADD COLUMN IF NOT EXISTS publisher text,
  ADD COLUMN IF NOT EXISTS posted_date timestamptz,
  ADD COLUMN IF NOT EXISTS salary_currency text,
  ADD COLUMN IF NOT EXISTS salary_period text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS company text;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_job_listings_role_category ON job_listings(role_category);
CREATE INDEX IF NOT EXISTS idx_job_listings_posted_date ON job_listings(posted_date);
CREATE INDEX IF NOT EXISTS idx_job_listings_analytics ON job_listings(title, location, posted_date);

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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS tr_set_role_category ON job_listings;

-- Create trigger for role category
CREATE TRIGGER tr_set_role_category
  BEFORE INSERT OR UPDATE OF title ON job_listings
  FOR EACH ROW
  EXECUTE FUNCTION set_role_category();