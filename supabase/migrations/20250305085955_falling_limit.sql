/*
  # Disable Row Level Security

  1. Changes
    - Disable RLS on all tables
    - Drop existing RLS policies
*/

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE resume_analyses DISABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_analyses DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_market_analytics DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can read own resume analyses" ON resume_analyses;
DROP POLICY IF EXISTS "Users can create own resume analyses" ON resume_analyses;
DROP POLICY IF EXISTS "Users can read own linkedin analyses" ON linkedin_analyses;
DROP POLICY IF EXISTS "Users can create own linkedin analyses" ON linkedin_analyses;
DROP POLICY IF EXISTS "Users can read own job market analytics" ON job_market_analytics;
DROP POLICY IF EXISTS "Users can create own job market analytics" ON job_market_analytics;