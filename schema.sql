-- ============================================
-- Madrasatus Sahaba Litahfizul Quran
-- COMPLETE DATABASE RESET + INITIAL DATA
-- Run in Supabase SQL Editor
-- This drops all old tables first, then creates fresh
-- ============================================

-- ============================================
-- STEP 1: DROP EVERYTHING OLD
-- ============================================

DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- ============================================
-- STEP 2: CREATE FRESH SCHEMA
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.students (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  joining_date DATE,
  joining_week INTEGER CHECK (joining_week >= 1 AND joining_week <= 53),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('R', 'M', 'X')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_student_date UNIQUE (student_id, date)
);

CREATE INDEX idx_attendance_student ON public.attendance_records(student_id);
CREATE INDEX idx_attendance_date ON public.attendance_records(date);

CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_achievements_student ON public.achievements(student_id);

-- ============================================
-- STEP 3: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read students" ON public.students FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read attendance" ON public.attendance_records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read achievements" ON public.achievements FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.students TO anon, authenticated;
GRANT SELECT ON public.attendance_records TO anon, authenticated;
GRANT SELECT ON public.achievements TO anon, authenticated;

-- ============================================
-- STEP 4: STUDENTS (10 total)
-- ============================================

INSERT INTO public.students (id, full_name, joining_date, joining_week) VALUES
('MS001', 'Isa Yahya Bayero', '2026-07-13', 1),
('MS002', 'Muhammad Adamu Muhammad', '2026-07-13', 1),
('MS003', 'Ummikulsum Yakubu Saleh', '2026-07-20', 2),
('MS004', 'Khadija Abdullahi Waziri', '2026-07-20', 2),
('MS005', 'Garba Adamu Arjali', '2026-07-27', 3),
('MS006', 'Muhammad Ali Dira', '2026-07-27', 3),
('MS007', 'Bilyaminu Mohammed Abdullahi', '2026-07-27', 3),
('MS008', 'Hadiza Muhammad Hamidu', '2026-07-27', 3),
('MS009', 'Ibrahim Ya''u Sulaiman', '2026-08-10', 5),
('MS010', 'Musa Ahmad', '2026-08-10', 5);

-- ============================================
-- STEP 5: ATTENDANCE RECORDS
-- ============================================

-- Week 1 (13-16 July 2026)
INSERT INTO public.attendance_records (student_id, date, status) VALUES
('MS001', '2026-07-13', 'R'), ('MS002', '2026-07-13', 'R'),
('MS001', '2026-07-14', 'R'), ('MS002', '2026-07-14', 'X'),
('MS001', '2026-07-15', 'R'), ('MS002', '2026-07-15', 'X'),
('MS001', '2026-07-16', 'R'), ('MS002', '2026-07-16', 'X');

-- Week 2 (20-23 July 2026)
INSERT INTO public.attendance_records (student_id, date, status) VALUES
('MS001', '2026-07-20', 'R'), ('MS002', '2026-07-20', 'R'), ('MS003', '2026-07-20', 'R'), ('MS004', '2026-07-20', 'X'),
('MS001', '2026-07-21', 'R'), ('MS002', '2026-07-21', 'R'), ('MS003', '2026-07-21', 'X'), ('MS004', '2026-07-21', 'X'),
('MS001', '2026-07-22', 'R'), ('MS002', '2026-07-22', 'R'), ('MS003', '2026-07-22', 'X'), ('MS004', '2026-07-22', 'X'),
('MS001', '2026-07-23', 'R'), ('MS002', '2026-07-23', 'X'), ('MS003', '2026-07-23', 'X'), ('MS004', '2026-07-23', 'X');

-- Week 3 (27-30 July 2026)
INSERT INTO public.attendance_records (student_id, date, status) VALUES
('MS001', '2026-07-27', 'R'), ('MS002', '2026-07-27', 'R'), ('MS003', '2026-07-27', 'R'), ('MS004', '2026-07-27', 'R'), ('MS005', '2026-07-27', 'X'), ('MS006', '2026-07-27', 'R'), ('MS007', '2026-07-27', 'R'), ('MS008', '2026-07-27', 'R'),
('MS001', '2026-07-28', 'R'), ('MS002', '2026-07-28', 'R'), ('MS003', '2026-07-28', 'R'), ('MS004', '2026-07-28', 'R'), ('MS005', '2026-07-28', 'X'), ('MS006', '2026-07-28', 'R'), ('MS007', '2026-07-28', 'R'), ('MS008', '2026-07-28', 'R'),
('MS001', '2026-07-29', 'R'), ('MS002', '2026-07-29', 'R'), ('MS003', '2026-07-29', 'R'), ('MS004', '2026-07-29', 'R'), ('MS005', '2026-07-29', 'X'), ('MS006', '2026-07-29', 'R'), ('MS007', '2026-07-29', 'R'), ('MS008', '2026-07-29', 'R'),
('MS001', '2026-07-30', 'R'), ('MS002', '2026-07-30', 'R'), ('MS003', '2026-07-30', 'R'), ('MS004', '2026-07-30', 'R'), ('MS005', '2026-07-30', 'X'), ('MS006', '2026-07-30', 'R'), ('MS007', '2026-07-30', 'R'), ('MS008', '2026-07-30', 'R');

-- Week 4 (3-4 August 2026)
INSERT INTO public.attendance_records (student_id, date, status) VALUES
('MS001', '2026-08-03', 'R'), ('MS002', '2026-08-03', 'R'), ('MS003', '2026-08-03', 'R'), ('MS004', '2026-08-03', 'X'), ('MS005', '2026-08-03', 'X'), ('MS006', '2026-08-03', 'X'), ('MS007', '2026-08-03', 'R'), ('MS008', '2026-08-03', 'R'),
('MS001', '2026-08-04', 'R'), ('MS002', '2026-08-04', 'X'), ('MS003', '2026-08-04', 'R'), ('MS004', '2026-08-04', 'X'), ('MS005', '2026-08-04', 'R'), ('MS006', '2026-08-04', 'X'), ('MS007', '2026-08-04', 'X'), ('MS008', '2026-08-04', 'X');

-- Week 5 (10-13 August 2026)
INSERT INTO public.attendance_records (student_id, date, status) VALUES
('MS001', '2026-08-10', 'R'), ('MS002', '2026-08-10', 'R'), ('MS003', '2026-08-10', 'R'), ('MS004', '2026-08-10', 'R'), ('MS005', '2026-08-10', 'X'), ('MS006', '2026-08-10', 'X'), ('MS007', '2026-08-10', 'R'), ('MS008', '2026-08-10', 'X'), ('MS009', '2026-08-10', 'X'), ('MS010', '2026-08-10', 'X'),
('MS001', '2026-08-11', 'R'), ('MS002', '2026-08-11', 'X'), ('MS003', '2026-08-11', 'R'), ('MS004', '2026-08-11', 'R'), ('MS005', '2026-08-11', 'R'), ('MS006', '2026-08-11', 'X'), ('MS007', '2026-08-11', 'R'), ('MS008', '2026-08-11', 'X'), ('MS009', '2026-08-11', 'X'), ('MS010', '2026-08-11', 'X'),
('MS001', '2026-08-12', 'R'), ('MS002', '2026-08-12', 'R'), ('MS003', '2026-08-12', 'X'), ('MS004', '2026-08-12', 'X'), ('MS005', '2026-08-12', 'R'), ('MS006', '2026-08-12', 'X'), ('MS007', '2026-08-12', 'R'), ('MS008', '2026-08-12', 'X'), ('MS009', '2026-08-12', 'R'), ('MS010', '2026-08-12', 'R'),
('MS001', '2026-08-13', 'R'), ('MS002', '2026-08-13', 'X'), ('MS003', '2026-08-13', 'X'), ('MS004', '2026-08-13', 'X'), ('MS005', '2026-08-13', 'R'), ('MS006', '2026-08-13', 'X'), ('MS007', '2026-08-13', 'X'), ('MS008', '2026-08-13', 'R'), ('MS009', '2026-08-13', 'R'), ('MS010', '2026-08-13', 'X');

-- Week 6 (17-20 August 2026)
INSERT INTO public.attendance_records (student_id, date, status) VALUES
('MS001', '2026-08-17', 'R'), ('MS002', '2026-08-17', 'R'), ('MS003', '2026-08-17', 'R'), ('MS004', '2026-08-17', 'R'), ('MS005', '2026-08-17', 'R'), ('MS006', '2026-08-17', 'R'), ('MS007', '2026-08-17', 'R'), ('MS008', '2026-08-17', 'R'), ('MS009', '2026-08-17', 'R'), ('MS010', '2026-08-17', 'R'),
('MS001', '2026-08-18', 'R'), ('MS002', '2026-08-18', 'X'), ('MS003', '2026-08-18', 'R'), ('MS004', '2026-08-18', 'R'), ('MS005', '2026-08-18', 'R'), ('MS006', '2026-08-18', 'X'), ('MS007', '2026-08-18', 'X'), ('MS008', '2026-08-18', 'R'), ('MS009', '2026-08-18', 'X'), ('MS010', '2026-08-18', 'R'),
('MS001', '2026-08-19', 'R'), ('MS002', '2026-08-19', 'X'), ('MS003', '2026-08-19', 'R'), ('MS004', '2026-08-19', 'X'), ('MS005', '2026-08-19', 'R'), ('MS006', '2026-08-19', 'X'), ('MS007', '2026-08-19', 'X'), ('MS008', '2026-08-19', 'R'), ('MS009', '2026-08-19', 'R'), ('MS010', '2026-08-19', 'R'),
('MS001', '2026-08-20', 'R'), ('MS002', '2026-08-20', 'X'), ('MS003', '2026-08-20', 'X'), ('MS004', '2026-08-20', 'X'), ('MS005', '2026-08-20', 'X'), ('MS006', '2026-08-20', 'X'), ('MS007', '2026-08-20', 'X'), ('MS008', '2026-08-20', 'X'), ('MS009', '2026-08-20', 'X'), ('MS010', '2026-08-20', 'X');

-- Week 7 (24-26 August 2026)
INSERT INTO public.attendance_records (student_id, date, status) VALUES
('MS001', '2026-08-24', 'R'), ('MS002', '2026-08-24', 'X'), ('MS003', '2026-08-24', 'R'), ('MS004', '2026-08-24', 'R'), ('MS005', '2026-08-24', 'M'), ('MS006', '2026-08-24', 'X'), ('MS007', '2026-08-24', 'R'), ('MS008', '2026-08-24', 'R'), ('MS009', '2026-08-24', 'R'), ('MS010', '2026-08-24', 'R'),
('MS001', '2026-08-25', 'R'), ('MS002', '2026-08-25', 'X'), ('MS003', '2026-08-25', 'R'), ('MS004', '2026-08-25', 'X'), ('MS005', '2026-08-25', 'M'), ('MS006', '2026-08-25', 'X'), ('MS007', '2026-08-25', 'X'), ('MS008', '2026-08-25', 'R'), ('MS009', '2026-08-25', 'X'), ('MS010', '2026-08-25', 'R'),
('MS001', '2026-08-26', 'R'), ('MS002', '2026-08-26', 'X'), ('MS003', '2026-08-26', 'X'), ('MS004', '2026-08-26', 'X'), ('MS005', '2026-08-26', 'R'), ('MS006', '2026-08-26', 'X'), ('MS007', '2026-08-26', 'X'), ('MS008', '2026-08-26', 'X'), ('MS009', '2026-08-26', 'X'), ('MS010', '2026-08-26', 'R');


-- ============================================
-- ANNOUNCEMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arabic_text TEXT,
  english_text TEXT,
  schedule TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.announcements TO anon, authenticated;