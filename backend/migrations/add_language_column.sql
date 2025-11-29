-- Add language column to analyses table for multilingual support
-- Run this in your Supabase SQL Editor

ALTER TABLE analyses
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';

-- Add a comment for documentation
COMMENT ON COLUMN analyses.language IS 'Language for LLM outputs (e.g., English, Hindi, Marathi, etc.)';
