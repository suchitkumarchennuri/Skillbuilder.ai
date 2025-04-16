/*
  # Fix LinkedIn Analyses Table

  1. Changes
    - Ensure strengths and weaknesses columns have proper JSONB type and defaults
    - Fix suggestions column to ensure it accepts valid JSONB
*/

-- First check if table exists
DO $$
BEGIN
  -- Check if the linkedin_analyses table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'linkedin_analyses'
  ) THEN
    -- If suggestions column doesn't have the right type, modify it
    IF (
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'linkedin_analyses' AND column_name = 'suggestions'
    ) != 'jsonb' THEN
      ALTER TABLE public.linkedin_analyses 
      ALTER COLUMN suggestions TYPE JSONB USING suggestions::jsonb;
    END IF;

    -- Set default value for suggestions column if NULL
    ALTER TABLE public.linkedin_analyses 
    ALTER COLUMN suggestions SET DEFAULT '[]'::jsonb;

    -- Ensure strengths column has proper type and default
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'linkedin_analyses' AND column_name = 'strengths'
    ) THEN
      ALTER TABLE public.linkedin_analyses 
      ALTER COLUMN strengths TYPE JSONB USING 
        CASE 
          WHEN strengths IS NULL THEN '[]'::jsonb
          ELSE strengths::jsonb
        END;
      
      ALTER TABLE public.linkedin_analyses 
      ALTER COLUMN strengths SET DEFAULT '[]'::jsonb;
    ELSE
      ALTER TABLE public.linkedin_analyses 
      ADD COLUMN strengths JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Ensure weaknesses column has proper type and default
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'linkedin_analyses' AND column_name = 'weaknesses'
    ) THEN
      ALTER TABLE public.linkedin_analyses 
      ALTER COLUMN weaknesses TYPE JSONB USING 
        CASE 
          WHEN weaknesses IS NULL THEN '[]'::jsonb
          ELSE weaknesses::jsonb
        END;
      
      ALTER TABLE public.linkedin_analyses 
      ALTER COLUMN weaknesses SET DEFAULT '[]'::jsonb;
    ELSE
      ALTER TABLE public.linkedin_analyses 
      ADD COLUMN weaknesses JSONB DEFAULT '[]'::jsonb;
    END IF;
  END IF;
END
$$; 