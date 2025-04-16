/*
  # Clean up job skills and add technical skills validation

  1. Changes
    - Clear existing job skills data
    - Add technical_skills table for valid skill validation
    - Add trigger to validate skills before insertion
    - Populate technical_skills with common industry skills

  2. Security
    - Enable RLS on technical_skills table
    - Add policies for read access
*/

-- First, clear existing job skills
TRUNCATE job_skills;

-- Create technical skills table
CREATE TABLE IF NOT EXISTS technical_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE technical_skills ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Anyone can read technical skills"
  ON technical_skills
  FOR SELECT
  TO public
  USING (true);

-- Function to validate skills
CREATE OR REPLACE FUNCTION validate_job_skill()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if skill exists in technical_skills table
  IF NOT EXISTS (
    SELECT 1 FROM technical_skills WHERE name = NEW.skill
  ) THEN
    RETURN NULL; -- Silently skip invalid skills
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for skill validation
DROP TRIGGER IF EXISTS validate_job_skill_trigger ON job_skills;
CREATE TRIGGER validate_job_skill_trigger
  BEFORE INSERT OR UPDATE ON job_skills
  FOR EACH ROW
  EXECUTE FUNCTION validate_job_skill();

-- Populate technical skills
INSERT INTO technical_skills (name, category) VALUES
  -- Programming Languages
  ('javascript', 'language'),
  ('typescript', 'language'),
  ('python', 'language'),
  ('java', 'language'),
  ('csharp', 'language'),
  ('cpp', 'language'),
  ('ruby', 'language'),
  ('php', 'language'),
  ('swift', 'language'),
  ('kotlin', 'language'),
  ('rust', 'language'),
  ('golang', 'language'),
  ('scala', 'language'),

  -- Web Technologies
  ('react', 'frontend'),
  ('angular', 'frontend'),
  ('vue', 'frontend'),
  ('nextjs', 'frontend'),
  ('nodejs', 'backend'),
  ('express', 'backend'),
  ('django', 'backend'),
  ('flask', 'backend'),
  ('spring', 'backend'),
  ('html', 'frontend'),
  ('css', 'frontend'),
  ('sass', 'frontend'),
  ('webpack', 'tooling'),
  ('vite', 'tooling'),
  ('tailwind', 'frontend'),

  -- Databases
  ('sql', 'database'),
  ('mongodb', 'database'),
  ('postgresql', 'database'),
  ('mysql', 'database'),
  ('redis', 'database'),
  ('elasticsearch', 'database'),
  ('supabase', 'database'),

  -- Cloud & DevOps
  ('aws', 'cloud'),
  ('azure', 'cloud'),
  ('gcp', 'cloud'),
  ('docker', 'devops'),
  ('kubernetes', 'devops'),
  ('jenkins', 'devops'),
  ('terraform', 'devops'),
  ('git', 'devops'),

  -- Testing
  ('jest', 'testing'),
  ('cypress', 'testing'),
  ('selenium', 'testing'),
  ('pytest', 'testing'),

  -- Mobile
  ('android', 'mobile'),
  ('ios', 'mobile'),
  ('flutter', 'mobile'),
  ('reactnative', 'mobile'),

  -- AI/ML
  ('tensorflow', 'ai'),
  ('pytorch', 'ai'),
  ('pandas', 'ai'),
  ('numpy', 'ai'),
  ('scikit', 'ai'),

  -- Architecture
  ('rest', 'architecture'),
  ('graphql', 'architecture'),
  ('microservices', 'architecture'),
  ('api', 'architecture')
ON CONFLICT (name) DO NOTHING;