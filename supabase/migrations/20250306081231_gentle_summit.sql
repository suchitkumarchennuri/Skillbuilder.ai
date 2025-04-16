/*
  # Job Listings Schema Update

  1. New Tables
    - `job_listings`
      - Core fields: id, title, company, description, url
      - Location fields: country, state, city
      - Employment details: employment_type, is_remote
      - Salary information: min, max, currency, period
      - Timestamps: posted_date, created_at, updated_at
      - Role categorization: role_category
    - `job_qualifications`
      - Links qualifications to job listings
      - Enables structured storage of requirements

  2. Indexes
    - Optimized for analytics queries
    - Location-based searching
    - Salary range filtering
    - Role category filtering

  3. Security
    - RLS enabled for both tables
    - Public read access policies
*/

-- Create job_listings table
CREATE TABLE IF NOT EXISTS job_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  company text NOT NULL,
  description text,
  url text UNIQUE NOT NULL,
  country text,
  state text,
  city text,
  employment_type text,
  is_remote boolean DEFAULT false,
  salary_min numeric,
  salary_max numeric,
  salary_currency text,
  salary_period text,
  posted_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  role_category text
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_job_listings_title ON job_listings(title);
CREATE INDEX IF NOT EXISTS idx_job_listings_location ON job_listings(country, state, city);
CREATE INDEX IF NOT EXISTS idx_job_listings_salary ON job_listings(salary_min, salary_max);
CREATE INDEX IF NOT EXISTS idx_job_listings_role_category ON job_listings(role_category);
CREATE INDEX IF NOT EXISTS idx_job_listings_posted_date ON job_listings(posted_date);
CREATE INDEX IF NOT EXISTS idx_job_listings_created_at ON job_listings(created_at);
CREATE INDEX IF NOT EXISTS idx_job_listings_is_remote ON job_listings(is_remote);
CREATE INDEX IF NOT EXISTS idx_job_listings_analytics ON job_listings(title, country, state, city, posted_date);

-- Create job_qualifications table
CREATE TABLE IF NOT EXISTS job_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  qualification text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for job_qualifications
CREATE INDEX IF NOT EXISTS idx_job_qualifications_job_id ON job_qualifications(job_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_job_listings_updated_at'
  ) THEN
    CREATE TRIGGER update_job_listings_updated_at
    BEFORE UPDATE ON job_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create role category trigger function
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

-- Create trigger for role category
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'tr_set_role_category'
  ) THEN
    CREATE TRIGGER tr_set_role_category
    BEFORE INSERT OR UPDATE OF title ON job_listings
    FOR EACH ROW
    EXECUTE FUNCTION set_role_category();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_qualifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can read job listings" ON job_listings;
  DROP POLICY IF EXISTS "Anyone can read job qualifications" ON job_qualifications;
END $$;

-- Create policies for public read access
CREATE POLICY "Anyone can read job listings"
ON job_listings
FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can read job qualifications"
ON job_qualifications
FOR SELECT
TO public
USING (true);