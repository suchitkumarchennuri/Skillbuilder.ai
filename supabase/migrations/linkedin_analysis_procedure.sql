/*
  # Add LinkedIn Analysis Stored Procedure

  1. Changes
    - Add stored procedure for LinkedIn analysis insertion
    - This provides a more reliable way to insert data via RPC
*/

-- Create or replace function for inserting LinkedIn analysis
CREATE OR REPLACE FUNCTION public.insert_linkedin_analysis(
  p_user_id UUID,
  p_profile_url TEXT,
  p_profile_score FLOAT,
  p_suggestions JSONB,
  p_strengths JSONB DEFAULT '[]'::jsonb,
  p_weaknesses JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run with definer's privileges
AS $$
DECLARE
  v_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- Ensure user exists before inserting
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    -- Create user record if it doesn't exist (fallback)
    INSERT INTO public.users (id, email, full_name)
    VALUES (p_user_id, 'auto-created@example.com', 'Auto-created User')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Insert the LinkedIn analysis
  INSERT INTO public.linkedin_analyses (
    user_id,
    profile_url,
    profile_score,
    suggestions,
    strengths,
    weaknesses
  )
  VALUES (
    p_user_id,
    p_profile_url,
    p_profile_score,
    p_suggestions,
    p_strengths,
    p_weaknesses
  )
  RETURNING id, created_at INTO v_id, v_created_at;

  -- Return the inserted record's ID and created_at timestamp
  RETURN jsonb_build_object(
    'id', v_id,
    'created_at', v_created_at
  );
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error inserting LinkedIn analysis: %', SQLERRM;
END;
$$; 