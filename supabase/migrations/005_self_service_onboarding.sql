-- ============================================================
-- MIGRATION 005: Self-Service Multi-Tenant Onboarding
-- Run this ONCE in your Supabase SQL Editor.
-- After this, everything is self-service — no more manual DB work.
-- ============================================================

-- 1. Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. Add company_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- 3. Add company_id to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 4. Add company_id to itr_filings
ALTER TABLE public.itr_filings
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 5. Migrate existing data: if there are existing profiles/clients, create a default company for them
DO $$
DECLARE
  default_company_id UUID;
  admin_user_id UUID;
BEGIN
  -- Only migrate if there are existing profiles without a company
  IF EXISTS (SELECT 1 FROM public.profiles WHERE company_id IS NULL LIMIT 1) THEN
    -- Find an admin user to own the default company
    SELECT id INTO admin_user_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
      -- Create a default company
      INSERT INTO public.companies (name, created_by)
      VALUES ('Default Firm', admin_user_id)
      RETURNING id INTO default_company_id;
      
      -- Assign all existing profiles to this company
      UPDATE public.profiles SET company_id = default_company_id WHERE company_id IS NULL;
      
      -- Assign all existing clients to this company
      UPDATE public.clients SET company_id = default_company_id WHERE company_id IS NULL;
      
      -- Assign all existing itr_filings to this company
      UPDATE public.itr_filings SET company_id = default_company_id WHERE company_id IS NULL;
    END IF;
  END IF;
END $$;

-- 6. JWT helper to get company_id from claims
CREATE OR REPLACE FUNCTION public.get_jwt_company_id()
RETURNS UUID AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'company_id',
    ''
  )::UUID;
$$ LANGUAGE sql STABLE;

-- 7. Update the auth sync trigger to also sync company_id
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_auth_users()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', NEW.role, 
      'department', NEW.department,
      'company_id', NEW.company_id
    )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger to also fire on company_id changes
DROP TRIGGER IF EXISTS on_profile_role_updated ON public.profiles;
CREATE TRIGGER on_profile_role_updated
  AFTER INSERT OR UPDATE OF role, department, company_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_to_auth_users();

-- 8. Update handle_new_user to NOT set a company (they'll pick one during onboarding)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, department, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'ALL'),
    (NEW.raw_user_meta_data->>'company_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Force sync all existing profiles to auth.users app_metadata
UPDATE auth.users
SET raw_app_meta_data = 
  coalesce(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'role', public.profiles.role, 
    'department', public.profiles.department,
    'company_id', public.profiles.company_id
  )
FROM public.profiles
WHERE auth.users.id = public.profiles.id;


-- ============================================================
-- 10. DROP & RECREATE ALL RLS POLICIES (company-scoped)
-- ============================================================

-- ---------- COMPANIES ----------
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Anyone can create a company" ON public.companies;

CREATE POLICY "Users can view own company"
  ON public.companies FOR SELECT
  USING (id = public.get_jwt_company_id());

-- Allow authenticated users to insert companies (for onboarding)
CREATE POLICY "Anyone can create a company"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---------- PROFILES ----------
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view department profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "HODs can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile v2" ON public.profiles;
DROP POLICY IF EXISTS "Company profiles visible" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Everyone can always read their OWN profile (even without a company, needed for onboarding)
CREATE POLICY "Users can read own profile v2"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Company members can see colleagues in their company
CREATE POLICY "Company profiles visible"
  ON public.profiles FOR SELECT
  USING (company_id = public.get_jwt_company_id());

-- Admins can update profiles in their company
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (
    public.get_jwt_role() = 'admin' 
    AND company_id = public.get_jwt_company_id()
  );

-- Users can update their own profile (needed for onboarding — setting company_id)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);


-- ---------- CLIENTS ----------
DROP POLICY IF EXISTS "Admins and HODs see all clients" ON public.clients;
DROP POLICY IF EXISTS "Employees see assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can modify clients" ON public.clients;
DROP POLICY IF EXISTS "HODs can modify clients" ON public.clients;

CREATE POLICY "Admins and HODs see all clients"
  ON public.clients FOR SELECT
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() IN ('admin', 'hod')
  );

CREATE POLICY "Employees see assigned clients"
  ON public.clients FOR SELECT
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'employee'
    AND EXISTS (
      SELECT 1 FROM public.itr_filings
      WHERE itr_filings.client_id = clients.id
      AND itr_filings.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Admins can modify clients"
  ON public.clients FOR ALL
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'admin'
  );

CREATE POLICY "HODs can modify clients"
  ON public.clients FOR ALL
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'hod'
  );


-- ---------- ITR FILINGS ----------
DROP POLICY IF EXISTS "Admins see all filings" ON public.itr_filings;
DROP POLICY IF EXISTS "HODs of ITR see filings" ON public.itr_filings;
DROP POLICY IF EXISTS "Employees see assigned filings" ON public.itr_filings;
DROP POLICY IF EXISTS "Admins can modify filings" ON public.itr_filings;
DROP POLICY IF EXISTS "HODs of ITR can modify filings" ON public.itr_filings;
DROP POLICY IF EXISTS "Employees can modify assigned filings" ON public.itr_filings;

CREATE POLICY "Admins see all filings"
  ON public.itr_filings FOR SELECT
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'admin'
  );

CREATE POLICY "HODs of ITR see filings"
  ON public.itr_filings FOR SELECT
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'hod' 
    AND public.get_jwt_department() = 'ITR'
  );

CREATE POLICY "Employees see assigned filings"
  ON public.itr_filings FOR SELECT
  USING (
    company_id = public.get_jwt_company_id()
    AND assigned_to = auth.uid()
  );

CREATE POLICY "Admins can modify filings"
  ON public.itr_filings FOR ALL
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'admin'
  );

CREATE POLICY "HODs of ITR can modify filings"
  ON public.itr_filings FOR ALL
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'hod' 
    AND public.get_jwt_department() = 'ITR'
  );

CREATE POLICY "Employees can modify assigned filings"
  ON public.itr_filings FOR ALL
  USING (
    company_id = public.get_jwt_company_id()
    AND assigned_to = auth.uid()
  );
