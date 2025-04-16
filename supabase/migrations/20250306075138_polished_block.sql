/*
  # Job Analytics Schema Update

  1. New Tables
    - `job_listings`
      - `id` (uuid, primary key)
      - `title` (text)
      - `country` (text)
      - `employment_type` (text)
      - `city` (text)
      - `state` (text)
      - `salary_min` (numeric)
      - `salary_max` (numeric)
      - `is_remote` (boolean)
      - `url` (text, unique)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `job_qualifications`
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key)
      - `qualification` (text)
      - `created_at` (timestamptz)

  2. Indexes
    - Index on job_listings(title) for faster job title searches
    - Index on job_listings(url) for uniqueness checks
    - Index on job_listings(created_at) for time-based filtering
    - Index on job_listings(is_remote) for remote job filtering
    - Index on job_qualifications(job_id) for faster qualification lookups

  3. Security
    - Enable RLS on all tables
    - Add policies for read access
*/

-- Create job_listings table
CREATE TABLE IF NOT EXISTS job_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  country text,
  employment_type text,
  city text,
  state text,
  salary_min numeric,
  salary_max numeric,
  is_remote boolean DEFAULT false,
  url text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create job_qualifications table
CREATE TABLE IF NOT EXISTS job_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  qualification text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes after tables exist
CREATE INDEX IF NOT EXISTS idx_job_listings_title ON job_listings(title);
CREATE INDEX IF NOT EXISTS idx_job_listings_created_at ON job_listings(created_at);
CREATE INDEX IF NOT EXISTS idx_job_listings_is_remote ON job_listings(is_remote);
CREATE INDEX IF NOT EXISTS idx_job_qualifications_job_id ON job_qualifications(job_id);

-- Enable Row Level Security
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_qualifications ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Check if trigger exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_job_listings_updated_at'
  ) THEN
    CREATE TRIGGER update_job_listings_updated_at
      BEFORE UPDATE ON job_listings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;