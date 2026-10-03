-- ====================================================================
-- RIMT UNIVERSITY: ADD INTERNSHIPS COLUMN TO STUDENTS TABLE
-- Adds JSONB column 'internships' to public.students table
-- Example structure:
-- [
--   {
--     "id": "INT-1718000000000",
--     "company": "Infosys",
--     "role": "Cloud Engineering Intern",
--     "duration": "Jun 2025 - Aug 2025",
--     "description": "Built serverless microservices and automated deployment pipelines.",
--     "certificate_url": "https://...",
--     "created_at": "2026-10-02T12:00:00.000Z"
--   }
-- ]
-- ====================================================================

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS internships JSONB DEFAULT '[]'::jsonb;

-- Ensure RLS allows reading and writing internships
NOTIFY pgrst, 'reload schema';
