"""
Database Setup Script - Creates required tables in Supabase
Run this script once to set up the database schema.
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

# Create Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Read the schema SQL file
schema_path = Path(__file__).parent / "supabase" / "schema_simplified.sql"
if not schema_path.exists():
    print(f"❌ Schema file not found: {schema_path}")
    sys.exit(1)

schema_sql = schema_path.read_text()

print("📋 Schema SQL loaded successfully")
print("\n" + "="*60)
print("IMPORTANT: You need to run this SQL in Supabase SQL Editor")
print("="*60)
print("\n1. Go to: https://supabase.com/dashboard/project/fxxwecwcwrerfcivmoaw/sql/new")
print("2. Copy and paste the SQL below")
print("3. Click 'Run' to execute")
print("\n" + "="*60 + "\n")
print(schema_sql)
print("\n" + "="*60)

# Alternative: Try to check if tables exist
print("\n🔍 Checking current database status...")

try:
    # Try to query analyses table
    result = supabase.table("analyses").select("id").limit(1).execute()
    print("✅ 'analyses' table exists")
except Exception as e:
    if "PGRST205" in str(e):
        print("❌ 'analyses' table does NOT exist - needs to be created")
    else:
        print(f"⚠️ Error checking analyses table: {e}")

try:
    # Try to query document_chunks table
    result = supabase.table("document_chunks").select("id").limit(1).execute()
    print("✅ 'document_chunks' table exists")
except Exception as e:
    if "PGRST205" in str(e):
        print("❌ 'document_chunks' table does NOT exist - needs to be created")
    else:
        print(f"⚠️ Error checking document_chunks table: {e}")

print("\n" + "="*60)
print("Next Steps:")
print("1. Copy the SQL schema above")
print("2. Go to Supabase SQL Editor")
print("3. Paste and run the SQL")
print("4. Then restart your servers with: ./restart.sh")
print("="*60)
