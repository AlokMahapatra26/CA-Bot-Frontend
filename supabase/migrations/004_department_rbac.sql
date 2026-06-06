-- ============================================================
-- MIGRATION: Department-Based Access Control (RBAC)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Alter public.profiles to add department field
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'ALL' 
  CHECK (department IN ('ITR', 'GST', 'DSC', 'ALL'));

-- 2. Alter public.itr_filings to add department-level assigned_to field
ALTER TABLE public.itr_filings 
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Migrate any existing client-wide staff assignments to their active ITR filings
UPDATE public.itr_filings
SET assigned_to = clients.assigned_to
FROM public.clients
WHERE itr_filings.client_id = clients.id;

-- 4. Helper function to instantly retrieve the user's department from JWT claims
CREATE OR REPLACE FUNCTION public.get_jwt_department()
RETURNS TEXT AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'department', ''),
    'ALL'
  );
$$ LANGUAGE sql STABLE;

-- 5. Update auth role & department sync trigger
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_auth_users()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role, 'department', NEW.department)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on profiles
DROP TRIGGER IF EXISTS on_profile_role_updated ON public.profiles;
CREATE TRIGGER on_profile_role_updated
  AFTER INSERT OR UPDATE OF role, department ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_to_auth_users();

-- Force sync all existing profiles to auth.users app_metadata
UPDATE auth.users
SET raw_app_meta_data = 
  coalesce(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', public.profiles.role, 'department', public.profiles.department)
FROM public.profiles
WHERE auth.users.id = public.profiles.id;


-- 6. Clean and Recreate all RLS policies to enforce Department-Based access

-- ----------------- PROFILES -----------------
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "HODs can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Staff can only view colleagues within their own department (or admins/HODs view all)
CREATE POLICY "Staff can view department profiles"
  ON public.profiles FOR SELECT
  USING (
    public.get_jwt_role() = 'admin'
    OR public.get_jwt_department() = 'ALL'
    -- Employees and HODs see profiles belonging to their own department
    OR department = public.get_jwt_department()
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.get_jwt_role() = 'admin');


-- ----------------- CLIENTS -----------------
DROP POLICY IF EXISTS "Admins and HODs see all clients" ON public.clients;
DROP POLICY IF EXISTS "Employees see assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can modify clients" ON public.clients;
DROP POLICY IF EXISTS "HODs can modify clients" ON public.clients;

-- Admins and HODs see all client profiles
CREATE POLICY "Admins and HODs see all clients"
  ON public.clients FOR SELECT
  USING (public.get_jwt_role() IN ('admin', 'hod'));

-- Employees only see clients where they are assigned to an active department filing
CREATE POLICY "Employees see assigned clients"
  ON public.clients FOR SELECT
  USING (
    public.get_jwt_role() = 'employee'
    AND EXISTS (
      SELECT 1 FROM public.itr_filings
      WHERE itr_filings.client_id = clients.id
      AND itr_filings.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Admins can modify clients"
  ON public.clients FOR ALL
  USING (public.get_jwt_role() = 'admin');

CREATE POLICY "HODs can modify clients"
  ON public.clients FOR ALL
  USING (public.get_jwt_role() = 'hod');


-- ----------------- ITR FILINGS -----------------
DROP POLICY IF EXISTS "Admins and HODs see all filings" ON public.itr_filings;
DROP POLICY IF EXISTS "Employees see assigned filings" ON public.itr_filings;
DROP POLICY IF EXISTS "Admins can modify filings" ON public.itr_filings;
DROP POLICY IF EXISTS "HODs can modify filings" ON public.itr_filings;

-- Admins see all ITR filings
CREATE POLICY "Admins see all filings"
  ON public.itr_filings FOR SELECT
  USING (public.get_jwt_role() = 'admin');

-- HOD of ITR department sees all filings
CREATE POLICY "HODs of ITR see filings"
  ON public.itr_filings FOR SELECT
  USING (
    public.get_jwt_role() = 'hod' 
    AND public.get_jwt_department() = 'ITR'
  );

-- Employees only see ITR filings assigned specifically to them
CREATE POLICY "Employees see assigned filings"
  ON public.itr_filings FOR SELECT
  USING (assigned_to = auth.uid());

CREATE POLICY "Admins can modify filings"
  ON public.itr_filings FOR ALL
  USING (public.get_jwt_role() = 'admin');

CREATE POLICY "HODs of ITR can modify filings"
  ON public.itr_filings FOR ALL
  USING (
    public.get_jwt_role() = 'hod' 
    AND public.get_jwt_department() = 'ITR'
  );

CREATE POLICY "Employees can modify assigned filings"
  ON public.itr_filings FOR ALL
  USING (assigned_to = auth.uid());
