-- ============================================================
-- MIGRATION 012: Add Phone Number and DOB to Profiles
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- 1. Alter public.profiles to add phone and date_of_birth fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- 2. Update handle_new_user trigger function to capture phone number and date_of_birth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, department, company_id, phone, date_of_birth)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'ALL'),
    (NEW.raw_user_meta_data->>'company_id')::UUID,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    (NEW.raw_user_meta_data->>'date_of_birth')::DATE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
