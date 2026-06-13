-- Migration 015: Remove default user_type from dsc_applications
ALTER TABLE public.dsc_applications ALTER COLUMN user_type DROP DEFAULT;
