-- Clarify Database Schema
-- Run this in your Supabase SQL Editor

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    page_count INTEGER DEFAULT 0,
    storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON public.documents
    FOR DELETE USING (auth.uid() = user_id);

-- Analyses table
CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'uploading',
    domain TEXT,
    domain_confidence FLOAT,
    intent TEXT,
    overall_score INTEGER,
    score_components JSONB,
    executive_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,

    CONSTRAINT valid_status CHECK (status IN (
        'uploading', 'processing', 'detecting_domain',
        'awaiting_intent', 'analyzing', 'scoring',
        'complete', 'error'
    ))
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses" ON public.analyses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses" ON public.analyses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses" ON public.analyses
    FOR UPDATE USING (auth.uid() = user_id);

-- Analysis documents junction table
CREATE TABLE IF NOT EXISTS public.analysis_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(analysis_id, document_id)
);

ALTER TABLE public.analysis_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis_documents" ON public.analysis_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.analyses
            WHERE id = analysis_documents.analysis_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own analysis_documents" ON public.analysis_documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses
            WHERE id = analysis_documents.analysis_id
            AND user_id = auth.uid()
        )
    );

-- Document chunks for vector search
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    page_number INTEGER,
    embedding vector(3072), -- text-embedding-3-large dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chunks" ON public.document_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE id = document_chunks.document_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own chunks" ON public.document_chunks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE id = document_chunks.document_id
            AND user_id = auth.uid()
        )
    );

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
    ON public.document_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Red flags table
CREATE TABLE IF NOT EXISTS public.red_flags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    severity TEXT NOT NULL,
    summary TEXT NOT NULL,
    explanation TEXT NOT NULL,
    source_text TEXT,
    page_number INTEGER,
    recommendation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_severity CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info'))
);

ALTER TABLE public.red_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own red_flags" ON public.red_flags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.analyses
            WHERE id = red_flags.analysis_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own red_flags" ON public.red_flags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses
            WHERE id = red_flags.analysis_id
            AND user_id = auth.uid()
        )
    );

-- Scenarios table
CREATE TABLE IF NOT EXISTS public.scenarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    likelihood TEXT NOT NULL,
    impact TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_likelihood CHECK (likelihood IN ('likely', 'possible', 'unlikely')),
    CONSTRAINT valid_impact CHECK (impact IN ('critical', 'high', 'medium', 'low', 'info'))
);

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scenarios" ON public.scenarios
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.analyses
            WHERE id = scenarios.analysis_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own scenarios" ON public.scenarios
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses
            WHERE id = scenarios.analysis_id
            AND user_id = auth.uid()
        )
    );

-- Key terms table
CREATE TABLE IF NOT EXISTS public.key_terms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    definition TEXT NOT NULL,
    importance TEXT NOT NULL DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_importance CHECK (importance IN ('high', 'medium', 'low'))
);

ALTER TABLE public.key_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own key_terms" ON public.key_terms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.analyses
            WHERE id = key_terms.analysis_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own key_terms" ON public.key_terms
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses
            WHERE id = key_terms.analysis_id
            AND user_id = auth.uid()
        )
    );

-- Missing clauses table
CREATE TABLE IF NOT EXISTS public.missing_clauses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE,
    clause_description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.missing_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own missing_clauses" ON public.missing_clauses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.analyses
            WHERE id = missing_clauses.analysis_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own missing_clauses" ON public.missing_clauses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analyses
            WHERE id = missing_clauses.analysis_id
            AND user_id = auth.uid()
        )
    );

-- OTP codes for passwordless authentication
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster OTP lookups
CREATE INDEX IF NOT EXISTS otp_codes_email_idx ON public.otp_codes(email);
CREATE INDEX IF NOT EXISTS otp_codes_expires_idx ON public.otp_codes(expires_at);

-- Function to clean up expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM public.otp_codes WHERE expires_at < NOW() OR used = TRUE;
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

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analyses_updated_at
    BEFORE UPDATE ON public.analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(3072),
    match_count INT DEFAULT 5,
    filter_analysis_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    analysis_id UUID,
    chunk_index INT,
    content TEXT,
    page_number INT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.analysis_id,
        dc.chunk_index,
        dc.content,
        dc.page_number,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    WHERE (filter_analysis_id IS NULL OR dc.analysis_id = filter_analysis_id)
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions for service role (backend)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
