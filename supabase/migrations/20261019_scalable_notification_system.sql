-- ====================================================================
-- RIMT UNIVERSITY: SCALABLE NOTIFICATION SYSTEM MIGRATION
-- Migration: 20261019_scalable_notification_system.sql
-- Description: Centralized notifications table, read receipts,
--              realtime publication, and automated event triggers.
-- ====================================================================

-- 1. Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- TABLE 1: NOTIFICATIONS (System-wide alerts & announcements)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('internship', 'drive', 'announcement', 'general', 'system')),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'department', 'batch', 'student')),
  target_id TEXT,                                      -- Department name, batch name, or student roll_no
  data JSONB NOT NULL DEFAULT '{}'::jsonb,             -- Metadata (stipend, ctc, company, deadline, links)
  action_route TEXT DEFAULT 'placement',               -- Target mobile route ('placement', 'home', etc.)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT DEFAULT 'T&P Administration',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
  ON public.notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type 
  ON public.notifications (type);

CREATE INDEX IF NOT EXISTS idx_notifications_target 
  ON public.notifications (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_notifications_active 
  ON public.notifications (is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public read active notifications" ON public.notifications;
CREATE POLICY "Public read active notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins full access on notifications" ON public.notifications;
CREATE POLICY "Admins full access on notifications"
  ON public.notifications
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ====================================================================
-- TABLE 2: STUDENT NOTIFICATION READS (Per-student read receipts)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.student_notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  roll_no TEXT NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unq_student_notification_read UNIQUE (notification_id, roll_no)
);

CREATE INDEX IF NOT EXISTS idx_student_notif_reads_lookup 
  ON public.student_notification_reads (upper(trim(roll_no)), notification_id);

ALTER TABLE public.student_notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view and manage their read receipts" ON public.student_notification_reads;
CREATE POLICY "Students can view and manage their read receipts"
  ON public.student_notification_reads
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- ====================================================================
-- REALTIME PUBLICATION: Enable live WebSocket broadcasting
-- ====================================================================

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.student_notification_reads REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_notification_reads;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ====================================================================
-- AUTOMATED TRIGGERS: Auto-create notification on internship creation
-- ====================================================================

CREATE OR REPLACE FUNCTION public.fn_notify_on_internship_created()
RETURNS TRIGGER AS $$
DECLARE
  v_stipend_label TEXT;
BEGIN
  IF NEW.compensation_type = 'stipend' AND NEW.stipend_amount IS NOT NULL THEN
    v_stipend_label := '₹' || to_char(NEW.stipend_amount, 'FM99,99,999') || '/month';
  ELSIF NEW.compensation_type = 'paid' THEN
    v_stipend_label := 'Paid Training';
  ELSE
    v_stipend_label := 'Non-Stipend';
  END IF;

  INSERT INTO public.notifications (
    title,
    message,
    type,
    priority,
    target_type,
    target_id,
    data,
    action_route,
    created_by
  ) VALUES (
    'New Internship: ' || NEW.title,
    NEW.company_name || ' announced a new internship opportunity for ' || NEW.title || ' (' || v_stipend_label || '). Duration: ' || NEW.duration_months || ' months. Application deadline: ' || coalesce(to_char(NEW.application_deadline, 'DD Mon YYYY'), 'Open') || '.',
    'internship',
    'HIGH',
    'all',
    NULL,
    jsonb_build_object(
      'opportunity_id', NEW.id,
      'company_name', NEW.company_name,
      'title', NEW.title,
      'compensation_type', NEW.compensation_type,
      'stipend_amount', NEW.stipend_amount,
      'duration_months', NEW.duration_months,
      'work_mode', NEW.work_mode,
      'location', NEW.location,
      'application_deadline', NEW.application_deadline,
      'required_skills', NEW.required_skills
    ),
    'placement',
    coalesce(NEW.created_by, 'T&P Department')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'internship_opportunities'
  ) THEN
    DROP TRIGGER IF EXISTS trg_notify_on_internship_created ON public.internship_opportunities;
    CREATE TRIGGER trg_notify_on_internship_created
      AFTER INSERT ON public.internship_opportunities
      FOR EACH ROW
      EXECUTE FUNCTION public.fn_notify_on_internship_created();
  END IF;
END $$;

-- ====================================================================
-- SEED INITIAL SYSTEM NOTIFICATIONS FOR IMMEDIATE VERIFICATION
-- ====================================================================

INSERT INTO public.notifications (
  id,
  title,
  message,
  type,
  priority,
  target_type,
  data,
  action_route,
  created_by
) VALUES 
(
  'e0000000-0000-0000-0000-000000000001',
  'New Internship: Cloud & DevOps Intern',
  'Infosys SpringBoard opened applications for Cloud & DevOps Interns (₹25,000/month). Duration: 6 months. Mode: Hybrid (Chandigarh/Mohali). Open to BCA and B.Sc Cyber Security students.',
  'internship',
  'HIGH',
  'all',
  jsonb_build_object(
    'company_name', 'Infosys SpringBoard',
    'title', 'Cloud & DevOps Intern',
    'compensation_type', 'stipend',
    'stipend_amount', 25000,
    'duration_months', 6,
    'work_mode', 'hybrid',
    'location', 'Chandigarh / Mohali',
    'application_deadline', '2026-11-15',
    'required_skills', jsonb_build_array('AWS', 'Docker', 'Linux', 'Python')
  ),
  'placement',
  'Prof. H. S. Bawa'
),
(
  'e0000000-0000-0000-0000-000000000002',
  'Placement Drive: TCS Digital & Ninja 2026',
  'Tata Consultancy Services (TCS) on-campus recruitment drive is scheduled for 28th October 2026. CTC Package: 7.5 - 11.5 LPA. Eligibility: Minimum 65% aggregate with zero active backlogs. Register by 24th Oct.',
  'drive',
  'URGENT',
  'all',
  jsonb_build_object(
    'company_name', 'Tata Consultancy Services',
    'role_title', 'Software Engineer / Systems Engineer',
    'package_min', 7.5,
    'package_max', 11.5,
    'mode', 'On-campus',
    'venue', 'RIMT Central Auditorium & Lab 4',
    'starts_at', '2026-10-28T09:30:00Z',
    'registration_deadline', '2026-10-24T23:59:00Z',
    'min_cgpa', 6.5
  ),
  'placement',
  'T&P Administration'
),
(
  'e0000000-0000-0000-0000-000000000003',
  'New Internship: Cyber Security Analyst Trainee',
  'QuickHeal Security Labs is inviting applications for a 4-month Cyber Security Analyst Trainee role (₹20,000/month stipend). Focus: Penetration testing and network forensics.',
  'internship',
  'NORMAL',
  'all',
  jsonb_build_object(
    'company_name', 'QuickHeal Security Labs',
    'title', 'Cyber Security Analyst Trainee',
    'compensation_type', 'stipend',
    'stipend_amount', 20000,
    'duration_months', 4,
    'work_mode', 'remote',
    'location', 'Remote',
    'application_deadline', '2026-11-05',
    'required_skills', jsonb_build_array('Network Security', 'Wireshark', 'Ethical Hacking')
  ),
  'placement',
  'T&P Administration'
)
ON CONFLICT (id) DO NOTHING;
