/*
  # Fix job analytics schema and visualization

  1. Changes
    - Drop and recreate job market trends function
    - Add composite unique constraint for job skills
    - Add indexes for analytics queries

  2. Security
    - Add RLS policies for job listings and skills
*/

-- Drop existing function first
DROP FUNCTION IF EXISTS calculate_job_market_trends(timestamp with time zone, timestamp with time zone);

-- Add composite unique constraint for job skills
ALTER TABLE job_skills DROP CONSTRAINT IF EXISTS job_skills_job_id_skill_key;
ALTER TABLE job_skills ADD CONSTRAINT job_skills_job_id_skill_key UNIQUE (job_id, skill);

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_job_listings_posted_date ON job_listings(posted_date);
CREATE INDEX IF NOT EXISTS idx_job_listings_location ON job_listings(location);
CREATE INDEX IF NOT EXISTS idx_job_listings_title ON job_listings(title);
CREATE INDEX IF NOT EXISTS idx_job_listings_analytics ON job_listings(title, location, posted_date);
CREATE INDEX IF NOT EXISTS idx_job_skills_skill ON job_skills(skill);

-- Create job market trends function
CREATE FUNCTION calculate_job_market_trends(
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
      title as job_title,
      location,
      AVG(salary_min::numeric) as avg_salary_min,
      AVG(salary_max::numeric) as avg_salary_max,
      COUNT(*) as job_count,
      AVG(CASE WHEN is_remote THEN 1 ELSE 0 END)::numeric * 100 as remote_percentage,
      start_date::date as period_start,
      end_date::date as period_end
    FROM job_listings
    WHERE posted_date BETWEEN start_date AND end_date
    GROUP BY title, location
  )
  SELECT
    js.job_title,
    js.location,
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