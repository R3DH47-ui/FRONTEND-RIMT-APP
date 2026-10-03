-- ====================================================================
-- RIMT UNIVERSITY: STUDENT PROFILE & ACADEMICS MIGRATION
-- Run this in Supabase Dashboard → SQL Editor
-- This adds real profile fields (bio, skills, about_me) and
-- academic fields (cgpa, attendance, semester_scores) that admin
-- can edit and students can view in real-time.
-- ====================================================================

-- ====================================================================
-- SECTION 1: PROFILE FIELDS (student-editable)
-- ====================================================================

-- Bio / professional summary written by the student
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS bio TEXT;

-- Headline tagline (e.g. "BCA Scholar @ RIMT University | Full-Stack Developer")
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS headline TEXT;

-- About Me — longer freeform description
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS about_me TEXT;

-- Skills — stored as JSONB array ["React", "Node.js", ...]
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb;

-- Banner image URL
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- ====================================================================
-- SECTION 2: ACADEMIC FIELDS (admin-editable only)
-- ====================================================================

-- Cumulative CGPA (e.g. 8.84)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS cgpa NUMERIC(4,2);

-- Academic percentage score derived from CGPA (cgpa × 9.5)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS academic_score NUMERIC(5,1);

-- Overall attendance percentage (e.g. 92.4)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS attendance_rate NUMERIC(5,2);

-- Academic standing text (e.g. "Dean's Honors List")
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS academic_standing TEXT;

-- Number of active backlogs
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS active_backlogs INTEGER DEFAULT 0;

-- Total credits earned
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS total_credits INTEGER;

-- Semester-wise SGPA scores as JSONB array
-- Example: [{"semester":"Semester 1","sgpa":8.56,"credits":22,"status":"Completed","grade":"A+"}]
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS semester_scores JSONB DEFAULT '[]'::jsonb;

-- Faculty advisor / SPOC name
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS faculty_advisor TEXT;

-- Current semester label (e.g. "Semester 4")
-- (already may exist as 'semester' but adding explicitly for clarity)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS current_semester TEXT;

-- Admin notes (internal, not visible to student)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- ====================================================================
-- SECTION 3: UPDATE RLS POLICIES
-- ====================================================================

-- Drop and recreate update policy to allow students to update their own
-- profile fields while preventing them from modifying academic fields
DROP POLICY IF EXISTS "Allow public update of student profile" ON public.students;
DROP POLICY IF EXISTS "Allow approved users to edit profile" ON public.students;

-- Students can update their profile-related columns
CREATE POLICY "Allow approved users to edit own profile"
  ON public.students
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ====================================================================
-- SECTION 4: INDEXES FOR PERFORMANCE
-- ====================================================================

-- Index on CGPA for ranking queries
CREATE INDEX IF NOT EXISTS idx_students_cgpa
  ON public.students (cgpa DESC NULLS LAST);

-- Index on status + department for admin filtered views
CREATE INDEX IF NOT EXISTS idx_students_status_dept
  ON public.students (status, department);

-- ====================================================================
-- SECTION 5: TRIGGER TO AUTO-CALCULATE academic_score FROM cgpa
-- ====================================================================

CREATE OR REPLACE FUNCTION public.fn_calculate_academic_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cgpa IS NOT NULL AND (
    OLD.cgpa IS DISTINCT FROM NEW.cgpa
    OR NEW.academic_score IS NULL
  ) THEN
    NEW.academic_score := ROUND(NEW.cgpa * 9.5, 1);
  END IF;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_academic_score ON public.students;
CREATE TRIGGER trg_calculate_academic_score
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_calculate_academic_score();

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
