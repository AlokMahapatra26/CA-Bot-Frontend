-- ============================================================
-- JWT-BASED RBAC (No Database Queries, No RLS Recursion!)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create a function to sync the role from profiles to auth.users app_metadata
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_auth_users()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the automatic sync trigger
DROP TRIGGER IF EXISTS on_profile_role_updated ON public.profiles;
CREATE TRIGGER on_profile_role_updated
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_to_auth_users();

-- 3. Sync existing profiles to auth.users raw_app_meta_data immediately
UPDATE auth.users
SET raw_app_meta_data = 
  coalesce(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', public.profiles.role)
FROM public.profiles
WHERE auth.users.id = public.profiles.id;

-- 4. Helper function to instantly retrieve the user's role from the JWT (NO recursion)
CREATE OR REPLACE FUNCTION public.get_jwt_role()
RETURNS TEXT AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role', ''),
    'employee'
  );
$$ LANGUAGE sql STABLE;

-- 5. Drop the old recursive helper function if it exists
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;

-- 6. Clean and Recreate all RLS policies using get_jwt_role()

-- public.profiles SELECT & UPDATE
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "HODs can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_jwt_role() = 'admin');

CREATE POLICY "HODs can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.get_jwt_role() = 'hod');

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.get_jwt_role() = 'admin');

-- public.clients ALL policies
DROP POLICY IF EXISTS "Admins and HODs see all clients" ON public.clients;
DROP POLICY IF EXISTS "Employees see assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can modify clients" ON public.clients;
DROP POLICY IF EXISTS "HODs can modify clients" ON public.clients;

CREATE POLICY "Admins and HODs see all clients"
  ON public.clients FOR SELECT
  USING (public.get_jwt_role() IN ('admin', 'hod'));

CREATE POLICY "Employees see assigned clients"
  ON public.clients FOR SELECT
  USING (
    public.get_jwt_role() = 'employee'
    AND assigned_to = auth.uid()
  );

CREATE POLICY "Admins can modify clients"
  ON public.clients FOR ALL
  USING (public.get_jwt_role() = 'admin');

CREATE POLICY "HODs can modify clients"
  ON public.clients FOR ALL
  USING (public.get_jwt_role() = 'hod');

-- public.itr_filings ALL policies
DROP POLICY IF EXISTS "Admins and HODs see all filings" ON public.itr_filings;
DROP POLICY IF EXISTS "Employees see assigned filings" ON public.itr_filings;
DROP POLICY IF EXISTS "Admins can modify filings" ON public.itr_filings;
DROP POLICY IF EXISTS "HODs can modify filings" ON public.itr_filings;

CREATE POLICY "Admins and HODs see all filings"
  ON public.itr_filings FOR SELECT
  USING (public.get_jwt_role() IN ('admin', 'hod'));

CREATE POLICY "Employees see assigned filings"
  ON public.itr_filings FOR SELECT
  USING (
    public.get_jwt_role() = 'employee'
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = itr_filings.client_id
      AND clients.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Admins can modify filings"
  ON public.itr_filings FOR ALL
  USING (public.get_jwt_role() = 'admin');

CREATE POLICY "HODs can modify filings"
  ON public.itr_filings FOR ALL
  USING (public.get_jwt_role() = 'hod');
