/*
  # Fix Job Market Trends Function

  1. Changes
    - Fix parameter type ambiguity for calculate_job_market_trends function
    - Ensure proper type casting and handling
    - Add proper function overloading resolution

  2. Security
    - Function remains accessible for analytics purposes
*/

-- Drop existing function if it exists (both variants)
DROP FUNCTION IF EXISTS calculate_job_market_trends(date, date);
DROP FUNCTION IF EXISTS calculate_job_market_trends(timestamptz, timestamptz);

-- Create function with explicit timestamptz parameters
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
    AVG(NULLIF(salary_min, 0)) as avg_salary_min,
    AVG(NULLIF(salary_max, 0)) as avg_salary_max,
    COUNT(*) as demand_score,
    (COUNT(*) FILTER (WHERE is_remote)) * 100.0 / NULLIF(COUNT(*), 0) as remote_percentage,
    start_date as period_start,
    end_date as period_end
  FROM job_listings
  WHERE posted_date BETWEEN start_date AND end_date
  GROUP BY title, location;
END;
$$ LANGUAGE plpgsql;