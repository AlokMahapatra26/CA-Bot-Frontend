-- ============================================================
-- RBAC Migration Script for CA-BOT
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Create the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'hod', 'employee')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Auto-create profile trigger
--    Whenever a new user signs up in auth.users, insert a row in profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Add assigned_to column to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 4. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itr_filings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for profiles
-- Everyone can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all profiles (role changes)
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. RLS Policies for clients
-- Admins and HODs can see all clients
CREATE POLICY "Admins and HODs see all clients"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'hod')
    )
  );

-- Employees see only assigned clients
CREATE POLICY "Employees see assigned clients"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'employee'
    )
    AND assigned_to = auth.uid()
  );

-- Admins can insert/update/delete clients
CREATE POLICY "Admins can modify clients"
  ON public.clients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- HODs can insert/update clients
CREATE POLICY "HODs can modify clients"
  ON public.clients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hod'
    )
  );

-- 7. RLS Policies for itr_filings
-- Admins and HODs see all filings
CREATE POLICY "Admins and HODs see all filings"
  ON public.itr_filings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'hod')
    )
  );

-- Employees see filings only for their assigned clients
CREATE POLICY "Employees see assigned filings"
  ON public.itr_filings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'employee'
    )
    AND EXISTS (
      SELECT 1 FROM public.clients WHERE clients.id = itr_filings.client_id AND clients.assigned_to = auth.uid()
    )
  );

-- Admins can modify all filings
CREATE POLICY "Admins can modify filings"
  ON public.itr_filings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- HODs can modify all filings
CREATE POLICY "HODs can modify filings"
  ON public.itr_filings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'hod'
    )
  );

-- 8. Allow service_role to bypass RLS (already default, but explicit)
-- The backend WhatsApp bot uses service_role key, so it always bypasses RLS.

-- ============================================================
-- SEED: Create the first admin account
-- Replace 'your-email@example.com' and 'YourSecurePassword123' 
-- with your actual credentials.
-- 
-- NOTE: Run this AFTER the migration above.
-- You can create the admin user via Supabase Dashboard:
--   Authentication → Users → Invite User
--   Then update their role in profiles:
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
-- ============================================================
