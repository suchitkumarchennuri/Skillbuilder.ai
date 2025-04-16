/*
  # Add LinkedIn Strengths and Weaknesses Columns

  1. Changes
    - Add strengths and weaknesses JSONB columns to linkedin_analyses table
    - Default both to empty arrays
*/

-- Add the new columns if they don't exist
DO $$
BEGIN
  -- Add strengths column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'linkedin_analyses' AND column_name = 'strengths'
  ) THEN
    ALTER TABLE public.linkedin_analyses ADD COLUMN strengths JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Add weaknesses column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'linkedin_analyses' AND column_name = 'weaknesses'
  ) THEN
    ALTER TABLE public.linkedin_analyses ADD COLUMN weaknesses JSONB DEFAULT '[]'::jsonb;
  END IF;
END
$$; 