-- Migration 008: Fix Client Visibility

-- The user wants employees to see all Client Profiles (Leads) in the system,
-- but NOT see any ITR filings unless they are explicitly assigned to them.

-- 1. Drop the restrictive policies from 007 and 005
DROP POLICY IF EXISTS "Employees see assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Employees can view assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Company members can view clients" ON public.clients;

-- 2. Allow all employees to see all client profiles in their company
-- This prevents the "completely blank screen" in the Client Profiles tab.
DROP POLICY IF EXISTS "Employees see all clients in company" ON public.clients;
CREATE POLICY "Employees see all clients in company"
  ON public.clients FOR SELECT
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'employee'
  );

-- 3. Ensure the ITR filings table remains STRICTLY assigned-only for employees
-- (This drops old overlapping policies just in case they were granting access)
DROP POLICY IF EXISTS "Employees can view assigned filings" ON public.itr_filings;
DROP POLICY IF EXISTS "Employees see assigned filings" ON public.itr_filings;

CREATE POLICY "Employees see assigned filings"
  ON public.itr_filings FOR SELECT
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'employee'
    AND assigned_to = auth.uid()
  );

-- We also make sure Admins and HODs can see all filings
DROP POLICY IF EXISTS "Admins see all filings" ON public.itr_filings;
CREATE POLICY "Admins see all filings"
  ON public.itr_filings FOR SELECT
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'admin'
  );

DROP POLICY IF EXISTS "HODs of ITR see filings" ON public.itr_filings;
CREATE POLICY "HODs of ITR see filings"
  ON public.itr_filings FOR SELECT
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'hod'
    AND public.get_jwt_department() = 'ITR'
  );
