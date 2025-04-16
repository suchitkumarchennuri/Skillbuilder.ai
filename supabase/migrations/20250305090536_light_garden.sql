/*
  # Fix user creation and constraints

  1. Changes
    - Add ON DELETE CASCADE to foreign key constraints
    - Add trigger to create user record on auth.users insert
*/

-- Add ON DELETE CASCADE to foreign key constraints
ALTER TABLE resume_analyses
DROP CONSTRAINT IF EXISTS resume_analyses_user_id_fkey,
ADD CONSTRAINT resume_analyses_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

ALTER TABLE linkedin_analyses
DROP CONSTRAINT IF EXISTS linkedin_analyses_user_id_fkey,
ADD CONSTRAINT linkedin_analyses_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

ALTER TABLE job_market_analytics
DROP CONSTRAINT IF EXISTS job_market_analytics_user_id_fkey,
ADD CONSTRAINT job_market_analytics_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();