-- ============================================================
-- FIX: Infinite recursion in profiles RLS policies
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Create a SECURITY DEFINER helper function
-- This function bypasses RLS when checking the current user's role,
-- which breaks the infinite recursion loop.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 2: Drop ALL existing policies on profiles, clients, itr_filings
-- (we'll recreate them cleanly)

-- profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- clients
DROP POLICY IF EXISTS "Admins and HODs see all clients" ON public.clients;
DROP POLICY IF EXISTS "Employees see assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can modify clients" ON public.clients;
DROP POLICY IF EXISTS "HODs can modify clients" ON public.clients;

-- itr_filings
DROP POLICY IF EXISTS "Admins and HODs see all filings" ON public.itr_filings;
DROP POLICY IF EXISTS "Employees see assigned filings" ON public.itr_filings;
DROP POLICY IF EXISTS "Admins can modify filings" ON public.itr_filings;
DROP POLICY IF EXISTS "HODs can modify filings" ON public.itr_filings;


-- Step 3: Recreate profiles policies using get_my_role()

-- Everyone can always read their own row
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can read ALL profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'admin');

-- HODs can also read all profiles (needed for staff list)
CREATE POLICY "HODs can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_my_role() = 'hod');

-- Admins can update any profile (role changes, etc.)
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.get_my_role() = 'admin');


-- Step 4: Recreate clients policies using get_my_role()

CREATE POLICY "Admins and HODs see all clients"
  ON public.clients FOR SELECT
  USING (public.get_my_role() IN ('admin', 'hod'));

CREATE POLICY "Employees see assigned clients"
  ON public.clients FOR SELECT
  USING (
    public.get_my_role() = 'employee'
    AND assigned_to = auth.uid()
  );

CREATE POLICY "Admins can modify clients"
  ON public.clients FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "HODs can modify clients"
  ON public.clients FOR ALL
  USING (public.get_my_role() = 'hod');


-- Step 5: Recreate itr_filings policies using get_my_role()

CREATE POLICY "Admins and HODs see all filings"
  ON public.itr_filings FOR SELECT
  USING (public.get_my_role() IN ('admin', 'hod'));

CREATE POLICY "Employees see assigned filings"
  ON public.itr_filings FOR SELECT
  USING (
    public.get_my_role() = 'employee'
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = itr_filings.client_id
      AND clients.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Admins can modify filings"
  ON public.itr_filings FOR ALL
  USING (public.get_my_role() = 'admin');

CREATE POLICY "HODs can modify filings"
  ON public.itr_filings FOR ALL
  USING (public.get_my_role() = 'hod');
