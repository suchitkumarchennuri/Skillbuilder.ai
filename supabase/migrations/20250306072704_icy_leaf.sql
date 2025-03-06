/*
  # Disable Row Level Security

  1. Changes
    - Disable RLS on job_listings table
    - Disable RLS on job_skills table
    - Disable RLS on job_market_trends table
    - Remove existing policies from these tables

  2. Security
    - WARNING: This removes access control at the row level
    - All authenticated users will have full access to these tables
*/

-- Disable RLS on job_listings
ALTER TABLE job_listings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read job listings" ON job_listings;
DROP POLICY IF EXISTS "Service role can manage job listings" ON job_listings;

-- Disable RLS on job_skills
ALTER TABLE job_skills DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read job skills" ON job_skills;
DROP POLICY IF EXISTS "Service role can manage job skills" ON job_skills;

-- Disable RLS on job_market_trends
ALTER TABLE job_market_trends DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read job market trends" ON job_market_trends;
DROP POLICY IF EXISTS "Service role can manage job market trends" ON job_market_trends;