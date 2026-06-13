-- ============================================================
-- MIGRATION 013: DSC Applications Table & RLS Policies
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- 1. Create dsc_applications table
CREATE TABLE IF NOT EXISTS public.dsc_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_type TEXT CHECK (user_type IN ('INDIVIDUAL', 'ORGANIZATION')) DEFAULT 'INDIVIDUAL',
  provider TEXT DEFAULT 'eMudhra',
  status TEXT DEFAULT 'AWAITING_TYPE',
  payment_status TEXT DEFAULT 'PENDING',
  token_pin TEXT,
  token_location TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dsc_applications ENABLE ROW LEVEL SECURITY;

-- 2. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_dsc_applications_updated ON public.dsc_applications;
CREATE TRIGGER on_dsc_applications_updated
  BEFORE UPDATE ON public.dsc_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Create RLS policies for DSC applications

-- Select Policies
CREATE POLICY "Admins see all DSC applications"
  ON public.dsc_applications FOR SELECT
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'admin'
  );

CREATE POLICY "HODs of DSC see all DSC applications"
  ON public.dsc_applications FOR SELECT
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'hod'
    AND public.get_jwt_department() = 'DSC'
  );

CREATE POLICY "Employees see assigned DSC applications"
  ON public.dsc_applications FOR SELECT
  USING (
    company_id = public.get_jwt_company_id()
    AND assigned_to = auth.uid()
  );

-- Modification Policies
CREATE POLICY "Admins can modify DSC applications"
  ON public.dsc_applications FOR ALL
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'admin'
  );

CREATE POLICY "HODs of DSC can modify DSC applications"
  ON public.dsc_applications FOR ALL
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'hod'
    AND public.get_jwt_department() = 'DSC'
  );

CREATE POLICY "Employees can modify assigned DSC applications"
  ON public.dsc_applications FOR ALL
  USING (
    company_id = public.get_jwt_company_id()
    AND assigned_to = auth.uid()
  );
