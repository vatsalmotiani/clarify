"""
Database Migration Script - Adds missing columns to the analyses table
Run this script to add the new columns required for the OpenAI Files API integration.

Usage: python migrate_add_columns.py
"""

import os
import sys
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_KEY in environment")
    sys.exit(1)

print(f"🔌 Connecting to Supabase: {SUPABASE_URL}")

# Migration SQL to add missing columns
MIGRATION_SQL = """
-- Migration: Add columns for OpenAI Files API integration
-- This adds new columns without dropping existing data

-- Add openai_file_ids column (stores OpenAI file IDs for reuse)
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS openai_file_ids JSONB DEFAULT '[]';

-- Add executive_summary column
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS executive_summary TEXT DEFAULT '';

-- Add scenarios column (for what-if analysis)
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS scenarios JSONB DEFAULT '[]';

-- Add missing_clauses column
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS missing_clauses JSONB DEFAULT '[]';

-- Add follow_up_questions column
ALTER TABLE public.analyses
ADD COLUMN IF NOT EXISTS follow_up_questions JSONB DEFAULT '[]';

-- Confirm migration
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Added columns: openai_file_ids, executive_summary, scenarios, missing_clauses, follow_up_questions';
END $$;
"""

print("\n" + "="*60)
print("DATABASE MIGRATION - Add Missing Columns")
print("="*60)
print("\nThis migration will add the following columns to the 'analyses' table:")
print("  • openai_file_ids (JSONB) - Stores OpenAI file IDs for reuse")
print("  • executive_summary (TEXT) - Brief summary of the analysis")
print("  • scenarios (JSONB) - What-if scenario analysis")
print("  • missing_clauses (JSONB) - Missing contract clauses")
print("  • follow_up_questions (JSONB) - Suggested follow-up questions")
print("\n" + "="*60)
print("SQL TO RUN IN SUPABASE SQL EDITOR:")
print("="*60)
print(MIGRATION_SQL)
print("="*60)

# Try to execute via Supabase RPC (if available)
print("\n🔍 Attempting to verify current table structure...")

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Try to query with the new columns to see if they exist
    try:
        result = supabase.table("analyses").select("id, openai_file_ids").limit(1).execute()
        print("✅ 'openai_file_ids' column already exists!")
    except Exception as e:
        if "PGRST204" in str(e):
            print("❌ 'openai_file_ids' column does NOT exist - needs migration")
        else:
            print(f"⚠️ Could not verify column: {e}")

    try:
        result = supabase.table("analyses").select("id, executive_summary").limit(1).execute()
        print("✅ 'executive_summary' column already exists!")
    except Exception as e:
        if "PGRST204" in str(e):
            print("❌ 'executive_summary' column does NOT exist - needs migration")
        else:
            print(f"⚠️ Could not verify column: {e}")

    try:
        result = supabase.table("analyses").select("id, scenarios").limit(1).execute()
        print("✅ 'scenarios' column already exists!")
    except Exception as e:
        if "PGRST204" in str(e):
            print("❌ 'scenarios' column does NOT exist - needs migration")
        else:
            print(f"⚠️ Could not verify column: {e}")

    try:
        result = supabase.table("analyses").select("id, missing_clauses").limit(1).execute()
        print("✅ 'missing_clauses' column already exists!")
    except Exception as e:
        if "PGRST204" in str(e):
            print("❌ 'missing_clauses' column does NOT exist - needs migration")
        else:
            print(f"⚠️ Could not verify column: {e}")

    try:
        result = supabase.table("analyses").select("id, follow_up_questions").limit(1).execute()
        print("✅ 'follow_up_questions' column already exists!")
    except Exception as e:
        if "PGRST204" in str(e):
            print("❌ 'follow_up_questions' column does NOT exist - needs migration")
        else:
            print(f"⚠️ Could not verify column: {e}")

except Exception as e:
    print(f"⚠️ Could not connect to verify: {e}")

print("\n" + "="*60)
print("NEXT STEPS:")
print("="*60)
print("1. Go to your Supabase SQL Editor:")
print("   https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new")
print("\n2. Copy and paste the SQL above")
print("\n3. Click 'Run' to execute the migration")
print("\n4. Restart your backend server")
print("="*60)
