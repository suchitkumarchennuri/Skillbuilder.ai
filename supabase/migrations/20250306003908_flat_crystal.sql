/*
  # Fix Users Table RLS Policies

  1. Changes
    - Drop existing RLS policies
    - Add comprehensive RLS policies for users table
    - Enable RLS on users table

  2. Security
    - Users can read their own data
    - Users can update their own data
    - Service role can manage all data
*/

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Create new policies
CREATE POLICY "Users can read own data"
ON users
FOR SELECT
USING (
  auth.uid() = id
);

CREATE POLICY "Users can update own data"
ON users
FOR UPDATE
USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id
);

CREATE POLICY "Service role can manage all data"
ON users
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy for inserting new users
CREATE POLICY "Users can insert own data"
ON users
FOR INSERT
WITH CHECK (
  auth.uid() = id
);