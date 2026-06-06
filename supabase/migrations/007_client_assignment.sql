-- Migration 007: Enable Direct Client Assignment

-- 1. Drop existing policies that might conflict
DROP POLICY IF EXISTS "Employees see assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Employees can view assigned clients" ON public.clients;

-- 2. Create the unified strict policy:
-- An employee can ONLY see a client if:
-- A) The client profile itself is directly assigned to them (clients.assigned_to = auth.uid())
-- OR
-- B) They are assigned to an active ITR filing for that client.
CREATE POLICY "Employees see assigned clients"
  ON public.clients FOR SELECT
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'employee'
    AND (
      assigned_to = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.itr_filings
        WHERE itr_filings.client_id = clients.id
        AND itr_filings.assigned_to = auth.uid()
      )
    )
  );

-- Also allow employees to UPDATE a client IF they are assigned to it
-- This allows them to update bot_status or upload docs for their assigned clients
DROP POLICY IF EXISTS "Employees can modify assigned clients" ON public.clients;
CREATE POLICY "Employees can modify assigned clients"
  ON public.clients FOR UPDATE
  USING (
    company_id = public.get_jwt_company_id()
    AND public.get_jwt_role() = 'employee'
    AND (
      assigned_to = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.itr_filings
        WHERE itr_filings.client_id = clients.id
        AND itr_filings.assigned_to = auth.uid()
      )
    )
  );
