-- ============================================================
-- MIGRATION 014: Multiple Departments Support
-- Run this in your Supabase SQL Editor or push via Supabase CLI.
-- ============================================================

-- 1. Drop the check constraint on public.profiles.department
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_department_check;

-- 2. Helper function to check if a user belongs to a department
CREATE OR REPLACE FUNCTION public.check_jwt_in_department(dept TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_dept TEXT;
BEGIN
  user_dept := coalesce(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'department', 'ALL');
  RETURN (user_dept = 'ALL' OR position(dept IN user_dept) > 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Drop and Recreate HOD policies for public.itr_filings
DROP POLICY IF EXISTS "HODs of ITR see filings" ON public.itr_filings;
CREATE POLICY "HODs of ITR see filings"
  ON public.itr_filings FOR SELECT
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'hod' 
    AND public.check_jwt_in_department('ITR')
  );

DROP POLICY IF EXISTS "HODs of ITR can modify filings" ON public.itr_filings;
CREATE POLICY "HODs of ITR can modify filings"
  ON public.itr_filings FOR ALL
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'hod' 
    AND public.check_jwt_in_department('ITR')
  );

-- 4. Drop and Recreate HOD policies for public.dsc_applications
DROP POLICY IF EXISTS "HODs of DSC see all DSC applications" ON public.dsc_applications;
CREATE POLICY "HODs of DSC see all DSC applications"
  ON public.dsc_applications FOR SELECT
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'hod'
    AND public.check_jwt_in_department('DSC')
  );

DROP POLICY IF EXISTS "HODs of DSC can modify DSC applications" ON public.dsc_applications;
CREATE POLICY "HODs of DSC can modify DSC applications"
  ON public.dsc_applications FOR ALL
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'hod'
    AND public.check_jwt_in_department('DSC')
  );

-- 5. Drop and Recreate policies for public.messages (chat channels)
DROP POLICY IF EXISTS "Users can read messages in their company and allowed channels" ON public.messages;
CREATE POLICY "Users can read messages in their company and allowed channels"
    ON public.messages FOR SELECT
    USING (
        company_id = get_jwt_company_id() AND
        (
            channel_name = 'firm_general' OR
            (channel_name = 'management' AND (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'hod'))) OR
            (channel_name = 'dept_itr' AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR public.check_jwt_in_department('ITR'))) OR
            (channel_name = 'dept_gst' AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR public.check_jwt_in_department('GST'))) OR
            (channel_name = 'dept_dsc' AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR public.check_jwt_in_department('DSC')))
        )
    );

DROP POLICY IF EXISTS "Users can insert messages into their company and allowed channels" ON public.messages;
CREATE POLICY "Users can insert messages into their company and allowed channels"
    ON public.messages FOR INSERT
    WITH CHECK (
        company_id = get_jwt_company_id() AND
        (
            channel_name = 'firm_general' OR
            (channel_name = 'management' AND (auth.jwt() -> 'app_metadata' ->> 'role' IN ('admin', 'hod'))) OR
            (channel_name = 'dept_itr' AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR public.check_jwt_in_department('ITR'))) OR
            (channel_name = 'dept_gst' AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR public.check_jwt_in_department('GST'))) OR
            (channel_name = 'dept_dsc' AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' OR public.check_jwt_in_department('DSC')))
        )
    );
