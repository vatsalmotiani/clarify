-- Clarify Simplified Database Schema
-- Run this in your Supabase SQL Editor
-- This is a simplified version for MVP without RLS (for easier development)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.document_chunks CASCADE;
DROP TABLE IF EXISTS public.analyses CASCADE;

-- Simplified analyses table (matches workflow expectations)
CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,  -- Optional for MVP
    document_names JSONB DEFAULT '[]',
    domain TEXT DEFAULT '',
    domain_confidence FLOAT DEFAULT 0.0,
    intent TEXT DEFAULT '',
    current_step TEXT DEFAULT 'pending',
    overall_score INTEGER DEFAULT 0,
    score_components JSONB DEFAULT '{}',
    document_summary TEXT DEFAULT '',
    key_terms JSONB DEFAULT '[]',
    main_obligations JSONB DEFAULT '[]',
    red_flags JSONB DEFAULT '[]',
    positive_notes JSONB DEFAULT '[]',
    overall_assessment TEXT DEFAULT '',
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simplified document_chunks table (for embeddings)
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    page_number INTEGER DEFAULT 1,
    chunk_index INTEGER DEFAULT 0,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'typed_text',
    confidence_score FLOAT DEFAULT 1.0,
    embedding vector(3072),  -- text-embedding-3-large dimension
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chunks_analysis_id ON public.document_chunks(analysis_id);

-- Create index for vector similarity search (using ivfflat)
-- Note: Only create after inserting some data
-- CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON public.document_chunks
--     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(3072),
    match_count INT DEFAULT 5,
    filter_analysis_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    analysis_id UUID,
    document_name TEXT,
    page_number INT,
    chunk_index INT,
    content TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.analysis_id,
        dc.document_name,
        dc.page_number,
        dc.chunk_index,
        dc.content,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    WHERE dc.embedding IS NOT NULL
      AND (filter_analysis_id IS NULL OR dc.analysis_id = filter_analysis_id)
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on analyses
DROP TRIGGER IF EXISTS update_analyses_updated_at ON public.analyses;
CREATE TRIGGER update_analyses_updated_at
    BEFORE UPDATE ON public.analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (allow anonymous access for MVP)
GRANT ALL ON public.analyses TO anon;
GRANT ALL ON public.analyses TO authenticated;
GRANT ALL ON public.document_chunks TO anon;
GRANT ALL ON public.document_chunks TO authenticated;

-- OTP codes table for authentication (optional)
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL ON public.otp_codes TO anon;
GRANT ALL ON public.otp_codes TO authenticated;

-- Confirmation message
DO $$
BEGIN
    RAISE NOTICE 'Schema created successfully!';
    RAISE NOTICE 'Tables: analyses, document_chunks, otp_codes';
END $$;
