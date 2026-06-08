-- Migration 009: Add services column to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS services TEXT[] DEFAULT '{}';
