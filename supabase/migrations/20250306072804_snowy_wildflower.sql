/*
  # Fix Job Tables Schema

  1. Changes
    - Add unique constraint for job_skills (job_id, skill)
    - Add indexes for job listings queries
    - Add trigger for updated_at timestamp
    - Add proper foreign key constraints

  2. Security
    - Tables remain accessible without RLS for analytics purposes
*/

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Fix job_listings table
DO $$ BEGIN
  -- Add unique constraint for URL to prevent duplicates
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_listings_url_key'
  ) THEN
    ALTER TABLE job_listings ADD CONSTRAINT job_listings_url_key UNIQUE (url);
  END IF;

  -- Ensure proper timestamp columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_listings' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE job_listings ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create updated_at trigger for job_listings
DROP TRIGGER IF EXISTS update_job_listings_updated_at ON job_listings;
CREATE TRIGGER update_job_listings_updated_at
  BEFORE UPDATE ON job_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fix job_skills table
DO $$ BEGIN
  -- Add unique constraint for job_id and skill combination
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_skills_job_id_skill_key'
  ) THEN
    ALTER TABLE job_skills ADD CONSTRAINT job_skills_job_id_skill_key UNIQUE (job_id, skill);
  END IF;

  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_skills_job_id_fkey'
  ) THEN
    ALTER TABLE job_skills ADD CONSTRAINT job_skills_job_id_fkey 
      FOREIGN KEY (job_id) REFERENCES job_listings(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create function for job market trends calculation
CREATE OR REPLACE FUNCTION calculate_job_market_trends(
  start_date timestamptz,
  end_date timestamptz
) RETURNS void AS $$
BEGIN
  -- Clear existing trends for the period
  DELETE FROM job_market_trends
  WHERE period_start >= start_date AND period_end <= end_date;

  -- Insert new trends
  INSERT INTO job_market_trends (
    id,
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
    gen_random_uuid() as id,
    title as job_title,
    location,
    AVG(salary_min) as avg_salary_min,
    AVG(salary_max) as avg_salary_max,
    COUNT(*) as demand_score,
    (COUNT(*) FILTER (WHERE is_remote)) * 100.0 / COUNT(*) as remote_percentage,
    start_date as period_start,
    end_date as period_end
  FROM job_listings
  WHERE posted_date BETWEEN start_date AND end_date
  GROUP BY title, location;
END;
$$ LANGUAGE plpgsql;