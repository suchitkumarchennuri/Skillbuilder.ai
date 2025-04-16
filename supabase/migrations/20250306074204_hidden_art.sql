/*
  # Update job analytics for tech roles

  1. Changes
    - Add role_category column to job_listings
    - Add function to normalize job titles
    - Update job market trends function to filter by role category
    - Add indexes for role-based queries

  2. Security
    - Maintain existing RLS policies
*/

-- Add role_category column
ALTER TABLE job_listings ADD COLUMN IF NOT EXISTS role_category text;
CREATE INDEX IF NOT EXISTS idx_job_listings_role_category ON job_listings(role_category);

-- Function to normalize job titles
CREATE OR REPLACE FUNCTION normalize_job_title(title text) 
RETURNS text AS $$
BEGIN
  RETURN CASE
    WHEN title ILIKE '%ai engineer%' OR title ILIKE '%artificial intelligence engineer%' THEN 'AI Engineer'
    WHEN title ILIKE '%ml engineer%' OR title ILIKE '%machine learning engineer%' THEN 'ML Engineer'
    WHEN title ILIKE '%java developer%' OR title ILIKE '%java engineer%' THEN 'Java Developer'
    WHEN title ILIKE '%software development engineer%' OR title ILIKE '%sde%' THEN 'Software Development Engineer'
    WHEN title ILIKE '%software ai%' OR title ILIKE '%ai software%' THEN 'Software AI Engineer'
    WHEN title ILIKE '%data engineer%' THEN 'Data Engineer'
    WHEN title ILIKE '%data analyst%' THEN 'Data Analyst'
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing job listings with role categories
UPDATE job_listings
SET role_category = normalize_job_title(title)
WHERE role_category IS NULL;

-- Create trigger to automatically set role_category
CREATE OR REPLACE FUNCTION set_role_category()
RETURNS trigger AS $$
BEGIN
  NEW.role_category := normalize_job_title(NEW.title);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_role_category ON job_listings;
CREATE TRIGGER tr_set_role_category
  BEFORE INSERT OR UPDATE OF title ON job_listings
  FOR EACH ROW
  EXECUTE FUNCTION set_role_category();

-- Update job market trends function
CREATE OR REPLACE FUNCTION calculate_job_market_trends(
  start_date timestamp with time zone,
  end_date timestamp with time zone
) RETURNS TABLE (
  job_title text,
  location text,
  avg_salary_min numeric,
  avg_salary_max numeric,
  demand_score numeric,
  remote_percentage numeric,
  period_start date,
  period_end date
) AS $$
BEGIN
  RETURN QUERY
  WITH job_stats AS (
    SELECT
      jl.role_category as job_title,
      jl.location as job_location,
      AVG(jl.salary_min::numeric) as avg_salary_min,
      AVG(jl.salary_max::numeric) as avg_salary_max,
      COUNT(*) as job_count,
      AVG(CASE WHEN jl.is_remote THEN 1 ELSE 0 END)::numeric * 100 as remote_percentage,
      start_date::date as period_start,
      end_date::date as period_end
    FROM job_listings jl
    WHERE 
      jl.posted_date BETWEEN start_date AND end_date
      AND jl.role_category IS NOT NULL
    GROUP BY jl.role_category, jl.location
  )
  SELECT
    js.job_title,
    js.job_location as location,
    ROUND(js.avg_salary_min, 2) as avg_salary_min,
    ROUND(js.avg_salary_max, 2) as avg_salary_max,
    ROUND(
      (js.job_count::numeric / NULLIF(MAX(js.job_count) OVER (), 0)) * 100,
      2
    ) as demand_score,
    ROUND(js.remote_percentage, 2) as remote_percentage,
    js.period_start,
    js.period_end
  FROM job_stats js
  WHERE js.job_count > 0
  ORDER BY js.job_count DESC;
END;
$$ LANGUAGE plpgsql;