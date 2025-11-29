# Clarify - Implementation Tasks

This document contains all tasks broken down into executable steps with prompts you can use to build the project incrementally.

**Directory Structure:**
```
/clarify-code
├── /frontend    # Next.js 14+ application
├── /backend     # Python + LangGraph API
└── TASKS.md     # This file
```

---

## Phase 1: Project Setup & Foundation

### Task 1.1: Backend Project Initialization

**Goal:** Set up Python backend with FastAPI and core dependencies

**Prompt:**
```
Create a Python backend project in /backend with the following:

1. Create a virtual environment and requirements.txt with these dependencies:
   - fastapi
   - uvicorn[standard]
   - python-multipart
   - langgraph
   - langchain
   - langchain-openai
   - openai
   - python-dotenv
   - supabase
   - pdf2image
   - Pillow
   - opencv-python
   - pytesseract
   - pydantic
   - python-jose[cryptography]
   - bcrypt
   - httpx

2. Create this folder structure:
   /backend
   ├── app/
   │   ├── __init__.py
   │   ├── main.py              # FastAPI app entry point
   │   ├── config.py            # Environment config
   │   ├── /api
   │   │   ├── __init__.py
   │   │   └── /routes
   │   │       ├── __init__.py
   │   │       ├── upload.py
   │   │       ├── analysis.py
   │   │       └── auth.py
   │   ├── /core
   │   │   ├── __init__.py
   │   │   ├── security.py
   │   │   └── dependencies.py
   │   ├── /services
   │   │   ├── __init__.py
   │   │   ├── document_processor.py
   │   │   ├── embedding_service.py
   │   │   └── analysis_service.py
   │   ├── /graph
   │   │   ├── __init__.py
   │   │   ├── state.py
   │   │   ├── nodes.py
   │   │   └── workflow.py
   │   ├── /prompts
   │   │   ├── __init__.py
   │   │   └── domain_prompts.py
   │   └── /models
   │       ├── __init__.py
   │       └── schemas.py
   ├── .env.example
   ├── requirements.txt
   └── README.md

3. In main.py, create a basic FastAPI app with CORS enabled for localhost:3000

4. In config.py, set up Pydantic Settings to load from .env:
   - OPENAI_API_KEY
   - SUPABASE_URL
   - SUPABASE_KEY
   - RESEND_API_KEY (for email)
   - JWT_SECRET
   - ENVIRONMENT (dev/prod)

5. Create .env.example with placeholder values

Test: Run `uvicorn app.main:app --reload` and verify the server starts
```

---

### Task 1.2: Frontend Project Initialization

**Goal:** Set up Next.js 14 with ShadCN UI and all required dependencies

**Prompt:**
```
Create a Next.js 14 frontend project in /frontend with the following:

1. Initialize Next.js with App Router:
   npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

2. Install additional dependencies:
   npm install zustand framer-motion lucide-react @radix-ui/react-icons
   npm install react-dropzone react-hook-form @hookform/resolvers zod
   npm install sonner (for toast notifications)

3. Initialize ShadCN UI:
   npx shadcn@latest init

   Choose these options:
   - Style: Default
   - Base color: Neutral
   - CSS variables: Yes

4. Add these ShadCN components:
   npx shadcn@latest add button card dialog sheet input textarea
   npx shadcn@latest add progress badge skeleton separator scroll-area
   npx shadcn@latest add tabs accordion alert tooltip form radio-group checkbox

5. Create this folder structure:
   /frontend/src
   ├── /app
   │   ├── layout.tsx
   │   ├── page.tsx
   │   ├── globals.css
   │   ├── /upload
   │   │   └── page.tsx
   │   ├── /analysis
   │   │   └── [id]
   │   │       └── page.tsx
   │   └── /api
   │       └── ... (API routes if needed)
   ├── /components
   │   ├── /ui              # ShadCN components (auto-generated)
   │   ├── /layout
   │   │   ├── Header.tsx
   │   │   ├── AppShell.tsx
   │   │   └── HistorySidebar.tsx
   │   ├── /upload
   │   │   ├── DropZone.tsx
   │   │   └── FileCard.tsx
   │   ├── /analysis
   │   │   ├── ScoreRing.tsx
   │   │   ├── SeverityBadge.tsx
   │   │   ├── FindingCard.tsx
   │   │   ├── DocumentSummary.tsx
   │   │   └── RedFlagDetail.tsx
   │   ├── /intent
   │   │   └── IntentSelector.tsx
   │   └── /auth
   │       └── AuthModal.tsx
   ├── /stores
   │   ├── useAnalysisStore.ts
   │   ├── useAuthStore.ts
   │   └── useUIStore.ts
   ├── /lib
   │   ├── utils.ts          # ShadCN utils (auto-generated)
   │   ├── api.ts            # API client
   │   └── constants.ts
   └── /types
       └── index.ts

6. Update globals.css with the color palette from the PRD (score colors, etc.)

7. Create a basic layout.tsx with Inter font and the Header component placeholder

Test: Run `npm run dev` and verify the app loads at localhost:3000
```

---

### Task 1.3: Supabase Database Setup

**Goal:** Set up Supabase project and create all required tables

**Prompt:**
```
Set up Supabase database with the schema from the PRD:

1. Create a new Supabase project (or use existing)

2. Enable the pgvector extension:
   Go to Database > Extensions > Search "vector" > Enable

3. Run this SQL in the SQL Editor to create all tables:

-- AUTHENTICATION TABLES
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE TABLE otp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_otp_email ON otp_tokens(email);
CREATE INDEX idx_otp_expires ON otp_tokens(expires_at);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- ANALYSIS TABLES
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID,
  document_names TEXT[] NOT NULL,
  domain TEXT NOT NULL,
  intent TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  score_components JSONB NOT NULL,
  document_summary TEXT,
  key_terms JSONB,
  main_obligations JSONB,
  red_flags JSONB NOT NULL,
  questions_asked JSONB,
  extraction_quality_report JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_analyses_user ON analyses(user_id);
CREATE INDEX idx_analyses_domain ON analyses(domain);
CREATE INDEX idx_analyses_created ON analyses(created_at DESC);

CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'typed_text',
  confidence_score FLOAT,
  embedding VECTOR(3072),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_chunks_analysis ON document_chunks(analysis_id);
CREATE INDEX idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- CLEANUP FUNCTIONS
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_anonymous_chunks()
RETURNS void AS $$
BEGIN
  DELETE FROM document_chunks
  WHERE analysis_id IN (
    SELECT id FROM analyses
    WHERE user_id IS NULL
    AND created_at < NOW() - INTERVAL '24 hours'
  );
END;
$$ LANGUAGE plpgsql;

4. Get your Supabase URL and anon key from Settings > API
5. Add these to your backend .env file

Test: Verify all tables exist in Supabase Table Editor
```

---

## Phase 2: Document Upload & Processing

### Task 2.1: Backend - File Upload Endpoint

**Goal:** Create API endpoint to receive and validate PDF uploads

**Prompt:**
```
In /backend, create the file upload endpoint:

1. In app/models/schemas.py, create Pydantic models:
   - UploadResponse: id (uuid), status, message, file_count
   - FileMetadata: name, size, page_count
   - ErrorResponse: error, detail

2. In app/api/routes/upload.py, create:
   - POST /api/upload endpoint that:
     - Accepts up to 5 PDF files (use UploadFile from FastAPI)
     - Validates each file:
       - Must be application/pdf
       - Must be ≤ 5MB
       - Must not be corrupted (try to open with pdf2image)
     - Returns validation errors with specific messages
     - On success, saves files temporarily and returns analysis_id

   - Include these validation error messages:
     - "Only PDF files are accepted"
     - "File exceeds 5MB limit"
     - "Maximum 5 files allowed"
     - "Unable to read file. Please check the PDF is not corrupted."

3. In app/main.py:
   - Include the upload router
   - Set max upload size in CORS/middleware

4. Create a /temp directory for storing uploaded files temporarily

Test with curl or Postman:
curl -X POST http://localhost:8000/api/upload \
  -F "files=@test.pdf"

Should return: {"id": "uuid", "status": "success", "file_count": 1}
```

---

### Task 2.2: Frontend - Upload Page UI

**Goal:** Create the document upload interface with drag-and-drop

**Prompt:**
```
In /frontend, create the upload page:

1. In src/components/upload/DropZone.tsx:
   - Use react-dropzone for drag-and-drop
   - Accept only PDF files
   - Show dashed border card with upload icon (Upload from lucide-react)
   - Display "Drag & drop PDF files here, or click to select"
   - Show "Maximum 5 files, 5MB each" below
   - Animate border color on drag over (use Framer Motion)
   - Call onFilesSelected callback with accepted files

2. In src/components/upload/FileCard.tsx:
   - Display file name, size (formatted as KB/MB)
   - Show File icon from lucide-react
   - Include X button to remove file
   - Use ShadCN Card component
   - Add subtle entrance animation (slide up + fade)

3. In src/app/upload/page.tsx:
   - Import DropZone and FileCard
   - Manage files state (array of File objects)
   - Display list of FileCards below DropZone
   - Show "Analyze" button (disabled when no files)
   - Validate:
     - Max 5 files (disable dropzone when reached)
     - Max 5MB per file (show error toast via sonner)
     - Only PDFs (dropzone handles this)
   - On "Analyze" click:
     - Upload files to backend
     - Show upload progress
     - Redirect to processing page on success

4. In src/stores/useAnalysisStore.ts:
   - Create Zustand store with:
     - uploadedFiles: File[]
     - analysisId: string | null
     - currentStep: 'upload' | 'processing' | 'intent' | 'questions' | 'results'
     - setFiles, setAnalysisId, setStep actions

5. In src/lib/api.ts:
   - Create uploadDocuments(files: File[]) function
   - Use FormData to send files
   - Return analysis ID on success
   - Handle errors appropriately

Test: Upload a PDF file, verify it appears in the list, click Analyze
```

---

### Task 2.3: Backend - Document Processing Service

**Goal:** Implement PDF text extraction with GPT-4o Vision

**Prompt:**
```
In /backend, create the document processing pipeline:

1. In app/services/document_processor.py, create DocumentProcessor class:

   Methods:
   - process_documents(file_paths: List[str]) -> Dict
     Main entry point that orchestrates the pipeline

   - convert_pdf_to_images(pdf_path: str) -> List[PIL.Image]
     Use pdf2image to convert each page to 300 DPI images

   - preprocess_image(image: PIL.Image) -> PIL.Image
     Apply OpenCV preprocessing:
     - Convert to grayscale
     - Apply adaptive thresholding if needed
     - Deskew if rotated
     Return processed image

   - assess_page_quality(image: PIL.Image) -> Dict
     Analyze image to determine:
     - has_handwriting: bool (detect non-uniform text regions)
     - has_charts: bool (detect large non-text regions)
     - is_degraded: bool (check contrast, noise levels)
     - confidence: float (0-1)

   - extract_text_vision(image: PIL.Image) -> Dict
     Send image to GPT-4o Vision API with this prompt:
     "Extract ALL text from this document image. Include:
     - All typed text, preserving structure (headings, paragraphs, lists)
     - All handwritten text, noting uncertain characters with [?]
     - Describe any tables in markdown format
     - Describe any charts/graphs with: type, title, key data points
     - Mark illegible sections as [illegible]
     - Note signature locations as [signature present]
     Return the extracted text maintaining document structure."

     Return: {text, confidence, content_types[], warnings[]}

   - extract_text_ocr(image: PIL.Image) -> Dict
     Use pytesseract as fallback for clean typed documents
     Return same structure as vision extraction

   - choose_extraction_method(quality: Dict) -> str
     If has_handwriting or has_charts or is_degraded:
       return "vision"
     else:
       return "ocr"

   - structure_content(pages: List[Dict]) -> Dict
     Combine all pages into structured document:
     {
       full_text: str,
       pages: [{page_num, text, content_types, confidence}],
       quality_report: {overall_confidence, warnings[]},
       metadata: {total_pages, extraction_method_used}
     }

2. Make sure to handle errors gracefully:
   - If Vision API fails, fall back to OCR
   - If OCR fails, mark page as [extraction failed]
   - Never raise unhandled exceptions

Test: Process a sample PDF and print the extracted structured content
```

---

### Task 2.4: Backend - Embedding Service

**Goal:** Create service to chunk documents and generate embeddings

**Prompt:**
```
In /backend, create the embedding service:

1. In app/services/embedding_service.py, create EmbeddingService class:

   Constructor:
   - Initialize OpenAI client
   - Initialize Supabase client
   - Set chunk_size = 800 tokens, overlap = 100 tokens

   Methods:
   - chunk_text(text: str, page_num: int) -> List[Dict]
     Split text into chunks with overlap
     Each chunk: {text, page_num, chunk_index, char_start, char_end}
     Use tiktoken to count tokens accurately
     Preserve sentence boundaries when possible

   - generate_embedding(text: str) -> List[float]
     Call OpenAI text-embedding-3-large
     Return 3072-dimension vector

   - generate_embeddings_batch(chunks: List[Dict]) -> List[Dict]
     Process chunks in batches of 20 (API limit)
     Add embedding field to each chunk
     Return chunks with embeddings

   - store_embeddings(analysis_id: str, chunks: List[Dict]) -> bool
     Insert chunks into document_chunks table in Supabase
     Include: analysis_id, document_name, page_number, chunk_index,
              content, content_type, confidence_score, embedding
     Return success/failure

   - search_similar(analysis_id: str, query: str, limit: int = 10) -> List[Dict]
     Generate embedding for query
     Search document_chunks using vector similarity
     Filter by analysis_id
     Return top matches with similarity score

2. In app/models/schemas.py, add:
   - ChunkSchema: text, page_num, chunk_index, embedding (optional)
   - SearchResult: chunk, similarity_score

Test:
- Create chunks from sample text
- Generate embeddings
- Store in Supabase
- Search and verify results return
```

---

### Task 2.5: Frontend - Processing Screen

**Goal:** Create the loading/processing UI with progress stages

**Prompt:**
```
In /frontend, create the processing screen:

1. In src/app/upload/processing/page.tsx (or a modal/component):
   - Display multi-stage progress indicator
   - Stages:
     1. "Reading your documents..." (0-30%)
     2. "Extracting text and images..." (30-60%)
     3. "Analyzing content..." (60-100%)

   - Use ShadCN Progress component
   - Show current stage text prominently
   - Animate progress bar smoothly (Framer Motion)
   - Display document icon with subtle pulse animation

   - Poll backend for status OR use Server-Sent Events:
     GET /api/analysis/{id}/status
     Returns: {stage: string, progress: number, message: string}

   - When complete, auto-redirect to intent selection

2. In src/components/analysis/ProcessingStage.tsx:
   - Reusable component for each stage
   - Props: label, isActive, isComplete
   - Show checkmark when complete
   - Show spinner/loader when active
   - Muted when pending

3. Add to useAnalysisStore:
   - processingStatus: {stage, progress, message}
   - setProcessingStatus action

4. Style notes:
   - Center content vertically and horizontally
   - Use muted colors, clean typography
   - No emojis - use lucide icons (FileText, Scan, Brain)
   - Subtle background pattern or solid color

Test: Trigger upload, verify processing screen shows with animated progress
```

---

## Phase 3: Domain Detection & Intent Selection

### Task 3.1: Backend - Domain & Intent Detection

**Goal:** Create LLM-powered domain detection and intent extraction

**Prompt:**
```
In /backend, implement domain and intent detection:

1. In app/prompts/domain_prompts.py, create:

ALLOWED_DOMAINS = [
    "real_estate",
    "employment",
    "finance",
    "rental",
    "insurance",
    "legal_agreement"
]

DOMAIN_TAXONOMY = {
    "real_estate": {
        "keywords": ["property", "deed", "title", "mortgage", "real estate", "land"],
        "description": "Real Estate Documents",
        "intents": [
            {"id": "buyer", "label": "I am buying this property", "description": "You want to purchase and will be the new owner"},
            {"id": "seller", "label": "I am selling this property", "description": "You own the property and are transferring ownership"},
            {"id": "reviewing", "label": "I am reviewing for someone else", "description": "You are helping someone understand this document"},
            {"id": "other", "label": "Other", "description": "My situation is different"}
        ]
    },
    "rental": {
        "keywords": ["lease", "tenant", "landlord", "rent", "premises", "occupancy"],
        "description": "Rental & Lease Agreements",
        "intents": [
            {"id": "tenant", "label": "I am the tenant signing this lease", "description": "You will be renting and living in the property"},
            {"id": "landlord", "label": "I am the landlord/property owner", "description": "You own the property and are leasing it out"},
            {"id": "reviewing", "label": "I am reviewing for someone else", "description": "You are helping someone understand this document"},
            {"id": "other", "label": "Other", "description": "My situation is different"}
        ]
    },
    "employment": {
        "keywords": ["employee", "employer", "salary", "compensation", "termination", "employment"],
        "description": "Employment Contracts",
        "intents": [
            {"id": "employee", "label": "I am the employee signing this contract", "description": "You are being hired and will work for this company"},
            {"id": "employer", "label": "I am the employer/company", "description": "You are hiring and this is your contract"},
            {"id": "reviewing", "label": "I am reviewing for someone else", "description": "You are helping someone understand this document"},
            {"id": "other", "label": "Other", "description": "My situation is different"}
        ]
    },
    "finance": {
        "keywords": ["loan", "credit", "interest", "principal", "payment", "financial"],
        "description": "Financial Documents",
        "intents": [
            {"id": "borrower", "label": "I am the borrower", "description": "You are taking the loan or credit"},
            {"id": "lender", "label": "I am the lender/institution", "description": "You are providing the loan or credit"},
            {"id": "reviewing", "label": "I am reviewing for someone else", "description": "You are helping someone understand this document"},
            {"id": "other", "label": "Other", "description": "My situation is different"}
        ]
    },
    "insurance": {
        "keywords": ["policy", "premium", "coverage", "claim", "insured", "insurance"],
        "description": "Insurance Policies",
        "intents": [
            {"id": "policyholder", "label": "I am buying/reviewing this policy", "description": "You are the one being insured"},
            {"id": "beneficiary", "label": "I am a beneficiary", "description": "You are named as a beneficiary on this policy"},
            {"id": "reviewing", "label": "I am reviewing for someone else", "description": "You are helping someone understand this document"},
            {"id": "other", "label": "Other", "description": "My situation is different"}
        ]
    },
    "legal_agreement": {
        "keywords": ["agreement", "contract", "party", "terms", "conditions", "obligations"],
        "description": "Legal Agreements (NDA, Service Contracts, etc.)",
        "intents": [
            {"id": "party_a", "label": "I am signing/agreeing to this", "description": "You are one of the parties entering this agreement"},
            {"id": "party_receiving", "label": "I am the party receiving services", "description": "You are receiving services or goods under this agreement"},
            {"id": "reviewing", "label": "I am reviewing for someone else", "description": "You are helping someone understand this document"},
            {"id": "other", "label": "Other", "description": "My situation is different"}
        ]
    }
}

DOMAIN_DETECTION_PROMPT = """
Analyze the following document text and determine its domain.

DOCUMENT TEXT:
{document_text}

ALLOWED DOMAINS:
- real_estate: Property purchases, deeds, titles, mortgages
- rental: Lease agreements, rental contracts, tenant/landlord documents
- employment: Job contracts, offer letters, employment agreements
- finance: Loans, credit agreements, financial contracts
- insurance: Insurance policies, coverage documents
- legal_agreement: NDAs, service contracts, general legal agreements

If the document does NOT fit any of these domains, respond with "unsupported".

Respond in JSON format:
{{
    "domain": "domain_name or unsupported",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation"
}}
"""

2. In app/graph/nodes.py, create domain_detection_node:
   - Takes document text from state
   - Calls GPT-4o with DOMAIN_DETECTION_PROMPT
   - Uses structured output (JSON mode)
   - Returns detected domain and intents from DOMAIN_TAXONOMY
   - If "unsupported", return allowed domains for user selection

3. In app/models/schemas.py, add:
   - DomainDetectionResult: domain, confidence, intents[], is_supported
   - IntentOption: id, label, description

Test: Send sample lease text, verify it returns "rental" domain with tenant/landlord intents
```

---

### Task 3.2: Backend - Intent Selection Endpoint

**Goal:** Create API endpoint to receive and store user's intent selection

**Prompt:**
```
In /backend, create intent selection endpoint:

1. In app/api/routes/analysis.py, create:

   GET /api/analysis/{analysis_id}/intents
   - Fetch analysis by ID
   - Return domain and intent options
   - Response: {
       domain: string,
       domain_description: string,
       is_supported: bool,
       intents: IntentOption[],
       allowed_domains: string[] (if unsupported)
     }

   POST /api/analysis/{analysis_id}/intent
   - Body: {intent_id: string, custom_intent?: string}
   - Validate intent_id is valid for the detected domain
   - If intent_id is "other", require custom_intent
   - Store selected intent in analysis record
   - Trigger next phase of analysis
   - Response: {success: bool, next_step: "questions" | "analysis"}

2. In app/models/schemas.py, add:
   - IntentSelectionRequest: intent_id, custom_intent (optional)
   - IntentSelectionResponse: success, next_step

3. Update the analysis record in Supabase with selected intent

Test:
- GET intents for an analysis
- POST intent selection
- Verify analysis record updated
```

---

### Task 3.3: Frontend - Intent Selection Page

**Goal:** Create the intent selection UI with domain display

**Prompt:**
```
In /frontend, create intent selection:

1. In src/components/intent/IntentSelector.tsx:
   - Props: domain, domainDescription, intents[], onSelect, isLoading
   - Display domain badge at top (e.g., "Rental Agreement Detected")
   - Show intents as selectable cards using ShadCN RadioGroup
   - Each card shows:
     - Radio button
     - Intent label (bold)
     - Intent description (muted text)
   - "Other" option reveals text input below
   - "Continue" button at bottom (disabled until selection)
   - Add stagger animation for cards entering

2. In src/components/intent/DomainSelector.tsx:
   - Used when document domain is unsupported
   - Props: allowedDomains[], onSelect
   - Display message: "We couldn't automatically detect the document type"
   - Show allowed domains as clickable cards
   - "Does your document belong to one of these categories?"
   - If user selects one, proceed with that domain's intents
   - If none match, show message: "Sorry, we can only analyze documents in these categories"

3. In src/app/analysis/[id]/intent/page.tsx:
   - Fetch intents from GET /api/analysis/{id}/intents
   - Show loading skeleton while fetching
   - If supported domain: show IntentSelector
   - If unsupported: show DomainSelector
   - On selection, POST to /api/analysis/{id}/intent
   - Redirect to questions page or results based on response

4. Update useAnalysisStore:
   - selectedIntent: string | null
   - customIntent: string | null
   - setIntent action

5. Animation:
   - Fade in page
   - Stagger cards with slideUp
   - Button enable animation

Test:
- View intent page for a rental document
- Select "I am the tenant"
- Verify redirect occurs
```

---

## Phase 4: LangGraph Workflow & Analysis

### Task 4.1: Backend - LangGraph State & Basic Workflow

**Goal:** Set up LangGraph state schema and basic workflow structure

**Prompt:**
```
In /backend, create the LangGraph workflow foundation:

1. In app/graph/state.py, define the state schema:

from typing import TypedDict, List, Dict, Optional, Annotated
from langgraph.graph import add_messages

class AnalysisState(TypedDict):
    # Input
    analysis_id: str
    documents: List[Dict]  # {name, text, pages[], quality_report}

    # Domain & Intent
    domain: str
    domain_confidence: float
    intent_options: List[Dict]
    selected_intent: str
    custom_intent: Optional[str]

    # Questions (optional)
    needs_questions: bool
    questions: List[str]
    user_answers: List[str]

    # Embeddings
    chunks: List[Dict]
    embeddings_stored: bool

    # Analysis Results
    document_summary: str
    key_terms: List[Dict]  # {term, explanation}
    main_obligations: List[str]
    red_flags: List[Dict]

    # Scoring
    overall_score: int
    score_components: Dict  # {completeness, fairness, clarity, risk}

    # Metadata
    current_step: str
    errors: List[str]

2. In app/graph/workflow.py, create the workflow:

from langgraph.graph import StateGraph, END
from app.graph.state import AnalysisState
from app.graph.nodes import (
    ingestion_node,
    vectorization_node,
    domain_detection_node,
    decision_node,
    question_generation_node,
    analysis_node,
    scoring_node,
    format_response_node,
    persist_node
)

def create_analysis_workflow():
    workflow = StateGraph(AnalysisState)

    # Add nodes
    workflow.add_node("ingestion", ingestion_node)
    workflow.add_node("vectorization", vectorization_node)
    workflow.add_node("domain_detection", domain_detection_node)
    workflow.add_node("decision", decision_node)
    workflow.add_node("question_generation", question_generation_node)
    workflow.add_node("analysis", analysis_node)
    workflow.add_node("scoring", scoring_node)
    workflow.add_node("format_response", format_response_node)
    workflow.add_node("persist", persist_node)

    # Define edges
    workflow.set_entry_point("ingestion")
    workflow.add_edge("ingestion", "vectorization")
    workflow.add_edge("vectorization", "domain_detection")
    workflow.add_edge("domain_detection", "decision")

    # Conditional edge for questions
    workflow.add_conditional_edges(
        "decision",
        lambda state: "question_generation" if state["needs_questions"] else "analysis",
        {
            "question_generation": "question_generation",
            "analysis": "analysis"
        }
    )

    # Question generation waits for user input (handled externally)
    workflow.add_edge("question_generation", END)  # Pause here

    # Continue after questions or directly to analysis
    workflow.add_edge("analysis", "scoring")
    workflow.add_edge("scoring", "format_response")
    workflow.add_edge("format_response", "persist")
    workflow.add_edge("persist", END)

    return workflow.compile()

# Create singleton instance
analysis_workflow = create_analysis_workflow()

3. Create placeholder functions in app/graph/nodes.py for each node
   (we'll implement them in subsequent tasks)

Test: Import workflow and verify it compiles without errors
```

---

### Task 4.2: Backend - Ingestion & Vectorization Nodes

**Goal:** Implement the first two nodes of the workflow

**Prompt:**
```
In /backend, implement ingestion and vectorization nodes:

1. In app/graph/nodes.py, implement ingestion_node:

async def ingestion_node(state: AnalysisState) -> AnalysisState:
    """
    Process uploaded documents and extract text.
    """
    from app.services.document_processor import DocumentProcessor

    processor = DocumentProcessor()
    analysis_id = state["analysis_id"]

    # Get file paths from temp storage
    file_paths = get_temp_files(analysis_id)

    # Process each document
    documents = []
    for path in file_paths:
        result = await processor.process_document(path)
        documents.append({
            "name": Path(path).name,
            "text": result["full_text"],
            "pages": result["pages"],
            "quality_report": result["quality_report"]
        })

    return {
        **state,
        "documents": documents,
        "current_step": "vectorization"
    }

2. Implement vectorization_node:

async def vectorization_node(state: AnalysisState) -> AnalysisState:
    """
    Chunk documents and generate embeddings.
    """
    from app.services.embedding_service import EmbeddingService

    embedding_service = EmbeddingService()
    all_chunks = []

    for doc in state["documents"]:
        # Chunk the document
        chunks = embedding_service.chunk_text(
            doc["text"],
            doc["name"]
        )
        all_chunks.extend(chunks)

    # Generate embeddings in batches
    chunks_with_embeddings = await embedding_service.generate_embeddings_batch(all_chunks)

    # Store in Supabase
    success = await embedding_service.store_embeddings(
        state["analysis_id"],
        chunks_with_embeddings
    )

    return {
        **state,
        "chunks": chunks_with_embeddings,
        "embeddings_stored": success,
        "current_step": "domain_detection"
    }

3. Update document processor to be async-compatible

4. Add error handling:
   - If ingestion fails, add error to state["errors"]
   - If embedding fails, continue without vector search capability

Test: Run first two nodes with sample document, verify embeddings stored
```

---

### Task 4.3: Backend - Analysis Node (Core Logic)

**Goal:** Implement the main document analysis with GPT-4o

**Prompt:**
```
In /backend, implement the analysis node:

1. In app/prompts/domain_prompts.py, create the analysis prompt:

ANALYSIS_PROMPT = """
You are Clarify, a document clarification expert helping a layperson understand {domain} documents.

## CONTEXT
USER INTENT: {intent}
{intent_description}

DOCUMENT CONTENT:
{document_text}

RELEVANT SECTIONS (from semantic search):
{retrieved_chunks}

{additional_context}

## YOUR PRIMARY TASK: CLARIFY THE DOCUMENT

First, provide a clear summary explaining:
1. What is this document? (1-2 sentences)
2. What are the key terms and conditions? (bullet points)
3. What are the main obligations for the user given their intent?

Use 8th-grade reading level. Avoid legal jargon - explain everything simply.

## SECONDARY TASK: IDENTIFY GENUINE ISSUES

Analyze for potential concerns. Look for:
- Missing critical clauses that should be present
- Ambiguous language open to interpretation
- Unfair or unusual terms compared to standard {domain} documents
- Legal loopholes that could disadvantage the user
- Conflicting clauses

## CRITICAL RULES - ZERO HALLUCINATION:
1. ONLY cite issues that ACTUALLY EXIST in the document text
2. For EVERY claim, you MUST provide the EXACT QUOTE from the document
3. If something is missing, say "this document does not include X"
4. If uncertain, say "this appears to..." or "it is unclear whether..."
5. Do NOT manufacture red flags to seem thorough
6. A clean document with few/no issues is a VALID outcome

## FAIRNESS REQUIREMENT:
- If the document is genuinely well-written with no significant issues, say so clearly
- Do not fear-monger or exaggerate minor issues
- Be balanced and honest

## OUTPUT FORMAT (JSON):

{{
    "document_summary": "Plain language summary of what this document is and does",
    "key_terms": [
        {{"term": "Term Name", "explanation": "What this means in simple language"}}
    ],
    "main_obligations": [
        "What the user must do or agree to, stated simply"
    ],
    "red_flags": [
        {{
            "id": "rf_1",
            "title": "5-8 word title",
            "severity": "critical|high|medium|low",
            "summary": "One sentence summary",
            "exact_quote": "The exact text from the document",
            "page_reference": "Page X, Section Y",
            "what_it_is": "2-3 sentence explanation",
            "why_it_matters": "Plain language explanation of impact",
            "consequences": ["Potential consequence 1", "Potential consequence 2"],
            "scenarios": [
                {{"title": "Scenario title", "description": "What could happen"}},
            ],
            "suggested_actions": ["What the user can do about this"]
        }}
    ],
    "positive_notes": [
        "Good things about this document (if any)"
    ],
    "overall_assessment": "Brief overall assessment of the document quality"
}}
"""

2. In app/graph/nodes.py, implement analysis_node:

async def analysis_node(state: AnalysisState) -> AnalysisState:
    """
    Perform main document analysis using GPT-4o.
    """
    from app.services.embedding_service import EmbeddingService
    from app.prompts.domain_prompts import ANALYSIS_PROMPT, DOMAIN_TAXONOMY
    from openai import AsyncOpenAI

    client = AsyncOpenAI()
    embedding_service = EmbeddingService()

    # Get full document text
    full_text = "\n\n".join([doc["text"] for doc in state["documents"]])

    # Get relevant chunks via semantic search
    # Search for key legal terms based on domain
    search_queries = get_domain_search_queries(state["domain"])
    relevant_chunks = []
    for query in search_queries:
        chunks = await embedding_service.search_similar(
            state["analysis_id"],
            query,
            limit=5
        )
        relevant_chunks.extend(chunks)

    # Deduplicate chunks
    relevant_chunks = deduplicate_chunks(relevant_chunks)

    # Build additional context from user answers
    additional_context = ""
    if state.get("user_answers"):
        additional_context = "USER PROVIDED CONTEXT:\n"
        for q, a in zip(state["questions"], state["user_answers"]):
            additional_context += f"Q: {q}\nA: {a}\n"

    # Get intent description
    intent_info = get_intent_info(state["domain"], state["selected_intent"])

    # Build prompt
    prompt = ANALYSIS_PROMPT.format(
        domain=state["domain"],
        intent=state["selected_intent"],
        intent_description=intent_info["description"],
        document_text=full_text[:50000],  # Limit to ~50k chars
        retrieved_chunks=format_chunks(relevant_chunks),
        additional_context=additional_context
    )

    # Call GPT-4o with JSON mode
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are Clarify, a document analysis expert. Always respond in valid JSON."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
        max_tokens=4000
    )

    # Parse response
    analysis = json.loads(response.choices[0].message.content)

    return {
        **state,
        "document_summary": analysis["document_summary"],
        "key_terms": analysis["key_terms"],
        "main_obligations": analysis["main_obligations"],
        "red_flags": analysis["red_flags"],
        "current_step": "scoring"
    }

3. Add helper functions:
   - get_domain_search_queries(domain) - return relevant search terms
   - deduplicate_chunks(chunks) - remove duplicate chunks
   - format_chunks(chunks) - format for prompt
   - get_intent_info(domain, intent_id) - get intent details

Test: Run analysis on a sample lease document, verify JSON output structure
```

---

### Task 4.4: Backend - Scoring Node

**Goal:** Implement the scoring engine

**Prompt:**
```
In /backend, implement the scoring node:

1. In app/graph/nodes.py, implement scoring_node:

async def scoring_node(state: AnalysisState) -> AnalysisState:
    """
    Calculate document score based on analysis results.
    """

    # Severity weights
    SEVERITY_WEIGHTS = {
        "critical": 25,
        "high": 15,
        "medium": 8,
        "low": 3
    }

    # Start with base score of 100
    base_score = 100

    # Calculate red flag penalty
    red_flag_penalty = 0
    for flag in state["red_flags"]:
        severity = flag.get("severity", "medium")
        red_flag_penalty += SEVERITY_WEIGHTS.get(severity, 5)

    # Cap penalty at 70 points (minimum score of 30)
    red_flag_penalty = min(red_flag_penalty, 70)

    # Calculate component scores

    # Completeness: Are standard clauses present?
    completeness_score = calculate_completeness(
        state["documents"],
        state["domain"]
    )

    # Clarity: How readable is the document?
    clarity_score = calculate_clarity(state["documents"])

    # Fairness: Based on red flag analysis from user's perspective
    fairness_score = 100 - (red_flag_penalty * 1.2)  # Weight fairness more
    fairness_score = max(fairness_score, 20)

    # Risk: Inverse of red flag severity
    risk_score = 100 - red_flag_penalty

    # Calculate overall score (weighted average)
    overall_score = int(
        (completeness_score * 0.2) +
        (clarity_score * 0.2) +
        (fairness_score * 0.35) +
        (risk_score * 0.25)
    )

    # Ensure score is in valid range
    overall_score = max(0, min(100, overall_score))

    score_components = {
        "completeness": int(completeness_score),
        "clarity": int(clarity_score),
        "fairness": int(fairness_score),
        "risk": int(risk_score)
    }

    return {
        **state,
        "overall_score": overall_score,
        "score_components": score_components,
        "current_step": "format_response"
    }

def calculate_completeness(documents: List[Dict], domain: str) -> float:
    """
    Check if standard clauses for the domain are present.
    """
    # Define expected clauses per domain
    EXPECTED_CLAUSES = {
        "rental": [
            "rent amount", "security deposit", "lease term",
            "maintenance", "termination", "late fees"
        ],
        "employment": [
            "compensation", "benefits", "termination",
            "confidentiality", "duties", "start date"
        ],
        # ... other domains
    }

    expected = EXPECTED_CLAUSES.get(domain, [])
    if not expected:
        return 80  # Default if domain not mapped

    full_text = " ".join([d["text"].lower() for d in documents])

    found = 0
    for clause in expected:
        if clause in full_text:
            found += 1

    return (found / len(expected)) * 100

def calculate_clarity(documents: List[Dict]) -> float:
    """
    Assess document readability.
    Simple heuristic based on sentence length and complex words.
    """
    full_text = " ".join([d["text"] for d in documents])

    sentences = full_text.split(".")
    avg_sentence_length = sum(len(s.split()) for s in sentences) / max(len(sentences), 1)

    # Ideal: 15-20 words per sentence
    if avg_sentence_length <= 20:
        length_score = 100
    elif avg_sentence_length <= 30:
        length_score = 80
    elif avg_sentence_length <= 40:
        length_score = 60
    else:
        length_score = 40

    return length_score

2. Add score interpretation helper:

def get_score_interpretation(score: int) -> Dict:
    if score >= 80:
        return {
            "level": "good",
            "color": "green",
            "message": "This document appears well-structured and fair"
        }
    elif score >= 60:
        return {
            "level": "moderate",
            "color": "yellow",
            "message": "This document has some areas that need attention"
        }
    elif score >= 40:
        return {
            "level": "concerning",
            "color": "orange",
            "message": "This document has significant concerns to address"
        }
    else:
        return {
            "level": "critical",
            "color": "red",
            "message": "This document has serious issues - consider professional review"
        }

Test: Calculate scores for documents with varying numbers of red flags
```

---

### Task 4.5: Backend - API Endpoint to Trigger Analysis

**Goal:** Create endpoint to run the full analysis workflow

**Prompt:**
```
In /backend, create the analysis execution endpoint:

1. In app/api/routes/analysis.py, add:

from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.graph.workflow import analysis_workflow
from app.graph.state import AnalysisState

router = APIRouter()

@router.post("/api/analysis/{analysis_id}/start")
async def start_analysis(
    analysis_id: str,
    background_tasks: BackgroundTasks
):
    """
    Start the analysis workflow for uploaded documents.
    Runs in background, client polls for status.
    """
    # Verify analysis exists
    analysis = await get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")

    # Initialize state
    initial_state = AnalysisState(
        analysis_id=analysis_id,
        documents=[],
        domain="",
        domain_confidence=0.0,
        intent_options=[],
        selected_intent="",
        custom_intent=None,
        needs_questions=False,
        questions=[],
        user_answers=[],
        chunks=[],
        embeddings_stored=False,
        document_summary="",
        key_terms=[],
        main_obligations=[],
        red_flags=[],
        overall_score=0,
        score_components={},
        current_step="ingestion",
        errors=[]
    )

    # Run workflow in background
    background_tasks.add_task(run_analysis_workflow, analysis_id, initial_state)

    return {"status": "started", "analysis_id": analysis_id}

async def run_analysis_workflow(analysis_id: str, initial_state: AnalysisState):
    """
    Execute the LangGraph workflow.
    """
    try:
        # Run through domain detection
        result = await analysis_workflow.ainvoke(
            initial_state,
            config={"recursion_limit": 10}
        )

        # Update analysis status in database
        await update_analysis_status(analysis_id, result)

    except Exception as e:
        await update_analysis_error(analysis_id, str(e))

@router.get("/api/analysis/{analysis_id}/status")
async def get_analysis_status(analysis_id: str):
    """
    Get current status of analysis.
    """
    analysis = await get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")

    return {
        "status": analysis.get("status", "pending"),
        "current_step": analysis.get("current_step", ""),
        "progress": calculate_progress(analysis.get("current_step")),
        "error": analysis.get("error")
    }

def calculate_progress(step: str) -> int:
    STEP_PROGRESS = {
        "ingestion": 20,
        "vectorization": 40,
        "domain_detection": 50,
        "decision": 55,
        "question_generation": 60,
        "waiting_for_answers": 65,
        "analysis": 75,
        "scoring": 90,
        "format_response": 95,
        "persist": 98,
        "complete": 100
    }
    return STEP_PROGRESS.get(step, 0)

@router.post("/api/analysis/{analysis_id}/continue")
async def continue_analysis(
    analysis_id: str,
    intent_id: str = None,
    answers: List[str] = None,
    background_tasks: BackgroundTasks
):
    """
    Continue analysis after user provides intent or answers.
    """
    # Get current state from database
    analysis = await get_analysis(analysis_id)

    state = AnalysisState(**analysis["state"])

    if intent_id:
        state["selected_intent"] = intent_id

    if answers:
        state["user_answers"] = answers

    # Continue workflow from appropriate point
    background_tasks.add_task(continue_workflow, analysis_id, state)

    return {"status": "continuing"}

2. Add database helper functions:
   - get_analysis(id) - fetch from Supabase
   - update_analysis_status(id, state) - update status
   - update_analysis_error(id, error) - store error

Test:
- POST /api/analysis/{id}/start
- Poll /api/analysis/{id}/status until complete
- Verify results in database
```

---

## Phase 5: Results Dashboard

### Task 5.1: Frontend - Score Ring Component

**Goal:** Create the circular score display component

**Prompt:**
```
In /frontend, create the ScoreRing component:

1. In src/components/analysis/ScoreRing.tsx:

Create a circular score indicator with these features:
- Props: score (0-100), size ('sm' | 'md' | 'lg'), showLabel (boolean)
- SVG-based circular progress
- NO gradients - use solid stroke colors:
  - score >= 70: green (hsl(142, 76%, 36%))
  - score 40-69: amber (hsl(38, 92%, 50%))
  - score < 40: red (hsl(0, 84%, 60%))
- Animate on mount:
  - Count up the number from 0 to score
  - Animate the circular stroke from 0 to percentage
  - Use Framer Motion for smooth animation
- Display score number in center (large, bold)
- Optional label below: "Document Score"
- Sizes:
  - sm: 80px diameter
  - md: 120px diameter
  - lg: 160px diameter

Implementation notes:
- Use SVG circle with strokeDasharray and strokeDashoffset
- Calculate circumference: 2 * PI * radius
- Offset = circumference * (1 - score/100)
- Use useEffect with requestAnimationFrame for count-up
- Respect prefers-reduced-motion

Example usage:
<ScoreRing score={75} size="lg" showLabel />

2. In src/components/analysis/ScoreCard.tsx:
- Wrapper component using ShadCN Card
- Contains ScoreRing centered
- Shows score interpretation text below:
  - >= 70: "This document appears well-structured"
  - 40-69: "Some areas need attention"
  - < 40: "Significant concerns found"
- Shows score breakdown (small bars for each component):
  - Completeness
  - Clarity
  - Fairness
  - Risk Level

Test: Render ScoreRing with various scores, verify animations work
```

---

### Task 5.2: Frontend - Finding Cards & Severity Badge

**Goal:** Create the red flag finding cards

**Prompt:**
```
In /frontend, create finding card components:

1. In src/components/analysis/SeverityBadge.tsx:
- Props: severity ('critical' | 'high' | 'medium' | 'low')
- Use ShadCN Badge component
- Colors (solid, no gradients):
  - critical: red background, white text
  - high: orange background, white text
  - medium: yellow background, dark text
  - low: gray background, dark text
- Include icon from lucide-react:
  - critical: AlertTriangle
  - high: AlertCircle
  - medium: Info
  - low: HelpCircle
- Accessible: includes sr-only text

2. In src/components/analysis/FindingCard.tsx:
- Props: finding (RedFlag type), onClick
- Use ShadCN Card component
- Layout:
  - Header: SeverityBadge + title
  - Body: summary (1-2 lines, truncated)
  - Footer: page reference (muted text)
- Hover state: subtle shadow increase, slight scale
- Click triggers onClick with finding id
- Entrance animation: slide up + fade (staggered in parent)

3. In src/types/index.ts, add types:

export interface RedFlag {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
  exact_quote: string;
  page_reference: string;
  what_it_is: string;
  why_it_matters: string;
  consequences: string[];
  scenarios: Scenario[];
  suggested_actions: string[];
}

export interface Scenario {
  title: string;
  description: string;
}

export interface AnalysisResult {
  id: string;
  domain: string;
  intent: string;
  overall_score: number;
  score_components: {
    completeness: number;
    clarity: number;
    fairness: number;
    risk: number;
  };
  document_summary: string;
  key_terms: { term: string; explanation: string }[];
  main_obligations: string[];
  red_flags: RedFlag[];
}

Test: Render FindingCard with sample data, verify hover and click
```

---

### Task 5.3: Frontend - Results Dashboard Page

**Goal:** Create the main analysis results page

**Prompt:**
```
In /frontend, create the results dashboard:

1. In src/app/analysis/[id]/page.tsx:

Create the main results page with:

Layout (desktop):
- Left column (1/3): ScoreCard (sticky)
- Right column (2/3):
  - Document Summary section
  - Key Terms section (collapsible)
  - Main Obligations section
  - Findings grid (red flags)

Layout (mobile):
- Single column, stacked
- ScoreCard at top
- Sections below

Sections:

a) Document Summary:
   - Card with plain text summary
   - Icon: FileText from lucide

b) Key Terms:
   - Accordion or collapsible list
   - Each term: bold term + explanation
   - Icon: BookOpen from lucide

c) Main Obligations:
   - Bullet list of obligations
   - Highlighted as important
   - Icon: ClipboardList from lucide

d) Findings:
   - Header: "Points of Attention" or "Red Flags Found"
   - If no red flags: Show positive message card
   - Filter buttons: All, Critical, High, Medium, Low
   - Sort: By severity (default), By page
   - Grid of FindingCards:
     - Desktop: 3 columns
     - Tablet: 2 columns
     - Mobile: 1 column
   - Staggered entrance animation

e) For clean documents (few/no red flags):
   - Show celebratory message (no emojis, use CheckCircle icon)
   - "This document appears to be well-structured and fair"
   - Still show document summary and key terms
   - Optional: "Things to be aware of" section for minor notes

2. Data fetching:
   - Use server component to fetch analysis
   - GET /api/analysis/{id}
   - Show skeleton loading state
   - Handle errors gracefully

3. State management:
   - Track selected filter in local state
   - Track selected finding for detail view

4. Navigation:
   - Back button to start new analysis
   - If authenticated: link to history

Test: Load results page with sample data, verify all sections render
```

---

### Task 5.4: Frontend - Red Flag Detail View

**Goal:** Create the detailed view for each finding

**Prompt:**
```
In /frontend, create the red flag detail view:

1. In src/components/analysis/RedFlagDetail.tsx:

Props: finding (RedFlag), onClose

Use ShadCN Sheet (mobile) or Dialog (desktop) based on screen size.

Layout:
- Header:
  - Back/Close button
  - Title
  - SeverityBadge
  - Page reference

- Section 1: "What It Is"
  - 2-3 sentence explanation
  - Card with highlighted background

- Section 2: "The Exact Text"
  - Quoted text from document
  - Styled as blockquote
  - Shows page/section reference

- Section 3: "Why This Matters"
  - Plain language explanation
  - How it affects the user

- Section 4: "Potential Consequences"
  - Bullet list
  - Each with warning icon

- Section 5: "Real-World Scenarios"
  - Expandable cards (ShadCN Accordion)
  - 4-5 scenarios
  - Each shows: title, description
  - Helps user understand practical impact

- Section 6: "What You Can Do"
  - Action items as checklist-style list
  - Each with action icon

Styling:
- Generous padding and spacing
- Clear section dividers
- Smooth scroll for long content
- Animations: fade in sections sequentially

2. In src/components/analysis/ScenarioCard.tsx:
- Props: scenario (Scenario), index
- Collapsible card
- Shows title, expands to show description
- Number indicator (1, 2, 3, etc.)

3. Integration:
- In results page, clicking FindingCard opens RedFlagDetail
- Pass finding data
- Mobile: slides up from bottom (Sheet)
- Desktop: modal overlay (Dialog)

Test: Click on finding card, verify detail view opens with all sections
```

---

### Task 5.5: Backend - Get Analysis Results Endpoint

**Goal:** Create endpoint to fetch complete analysis results

**Prompt:**
```
In /backend, create the results endpoint:

1. In app/api/routes/analysis.py, add:

@router.get("/api/analysis/{analysis_id}")
async def get_analysis_results(analysis_id: str):
    """
    Get complete analysis results.
    """
    # Fetch from Supabase
    analysis = await supabase.table("analyses").select("*").eq("id", analysis_id).single().execute()

    if not analysis.data:
        raise HTTPException(404, "Analysis not found")

    data = analysis.data

    # Check if analysis is complete
    if data.get("status") != "complete":
        return {
            "status": data.get("status", "pending"),
            "current_step": data.get("current_step"),
            "progress": calculate_progress(data.get("current_step"))
        }

    # Return full results
    return {
        "id": data["id"],
        "status": "complete",
        "domain": data["domain"],
        "intent": data["intent"],
        "overall_score": data["overall_score"],
        "score_components": data["score_components"],
        "document_summary": data["document_summary"],
        "key_terms": data["key_terms"],
        "main_obligations": data["main_obligations"],
        "red_flags": data["red_flags"],
        "document_names": data["document_names"],
        "created_at": data["created_at"]
    }

@router.get("/api/analysis/{analysis_id}/finding/{finding_id}")
async def get_finding_detail(analysis_id: str, finding_id: str):
    """
    Get detailed information for a specific finding.
    Used for lazy loading scenario data.
    """
    analysis = await get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(404, "Analysis not found")

    red_flags = analysis.get("red_flags", [])
    finding = next((f for f in red_flags if f["id"] == finding_id), None)

    if not finding:
        raise HTTPException(404, "Finding not found")

    return finding

2. In app/models/schemas.py, add response models:

class AnalysisResultResponse(BaseModel):
    id: str
    status: str
    domain: str
    intent: str
    overall_score: int
    score_components: Dict[str, int]
    document_summary: str
    key_terms: List[Dict[str, str]]
    main_obligations: List[str]
    red_flags: List[RedFlagSchema]
    document_names: List[str]
    created_at: datetime

class RedFlagSchema(BaseModel):
    id: str
    title: str
    severity: str
    summary: str
    exact_quote: str
    page_reference: str
    what_it_is: str
    why_it_matters: str
    consequences: List[str]
    scenarios: List[ScenarioSchema]
    suggested_actions: List[str]

class ScenarioSchema(BaseModel):
    title: str
    description: str

Test: Fetch completed analysis, verify all fields present
```

---

## Phase 6: Authentication

### Task 6.1: Backend - Email OTP Service

**Goal:** Implement OTP generation and email sending

**Prompt:**
```
In /backend, create the OTP authentication service:

1. In app/services/auth_service.py:

import secrets
import hashlib
from datetime import datetime, timedelta
from resend import Resend  # or your chosen SMTP provider

class AuthService:
    def __init__(self):
        self.resend = Resend(api_key=settings.RESEND_API_KEY)

    async def generate_otp(self, email: str) -> str:
        """Generate 6-digit OTP and store hashed version."""
        # Check rate limit
        recent_count = await self._count_recent_otps(email)
        if recent_count >= 3:
            raise RateLimitError("Too many OTP requests. Try again in 15 minutes.")

        # Generate OTP
        otp = ''.join([str(secrets.randbelow(10)) for _ in range(6)])

        # Hash before storing
        otp_hash = hashlib.sha256(otp.encode()).hexdigest()

        # Store in database
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        await supabase.table("otp_tokens").insert({
            "email": email,
            "otp_hash": otp_hash,
            "expires_at": expires_at.isoformat(),
            "used": False,
            "attempts": 0
        }).execute()

        return otp

    async def send_otp_email(self, email: str, otp: str):
        """Send OTP via email."""
        self.resend.emails.send({
            "from": "Clarify <noreply@clarify.app>",
            "to": email,
            "subject": "Your Clarify verification code",
            "html": f"""
                <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
                    <h2>Your verification code</h2>
                    <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;
                              background: #f5f5f5; padding: 20px; text-align: center;">
                        {otp}
                    </p>
                    <p>This code expires in 10 minutes.</p>
                    <p style="color: #666; font-size: 14px;">
                        If you didn't request this code, you can safely ignore this email.
                    </p>
                </div>
            """
        })

    async def verify_otp(self, email: str, otp: str) -> bool:
        """Verify OTP and return success."""
        otp_hash = hashlib.sha256(otp.encode()).hexdigest()

        # Get most recent unused OTP for email
        result = await supabase.table("otp_tokens") \
            .select("*") \
            .eq("email", email) \
            .eq("used", False) \
            .gt("expires_at", datetime.utcnow().isoformat()) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if not result.data:
            return False

        token = result.data[0]

        # Check attempts
        if token["attempts"] >= 5:
            raise RateLimitError("Too many failed attempts. Request a new code.")

        # Increment attempts
        await supabase.table("otp_tokens") \
            .update({"attempts": token["attempts"] + 1}) \
            .eq("id", token["id"]) \
            .execute()

        # Verify hash
        if token["otp_hash"] != otp_hash:
            return False

        # Mark as used
        await supabase.table("otp_tokens") \
            .update({"used": True}) \
            .eq("id", token["id"]) \
            .execute()

        return True

    async def create_session(self, email: str) -> Dict:
        """Create or get user and create session."""
        # Get or create user
        user = await self._get_or_create_user(email)

        # Generate tokens
        access_token = create_access_token(user["id"])
        refresh_token = secrets.token_urlsafe(32)

        # Store refresh token hash
        refresh_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        expires_at = datetime.utcnow() + timedelta(days=7)

        await supabase.table("sessions").insert({
            "user_id": user["id"],
            "refresh_token_hash": refresh_hash,
            "expires_at": expires_at.isoformat()
        }).execute()

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {"id": user["id"], "email": user["email"]}
        }

2. In app/core/security.py, add JWT helpers:

from jose import jwt
from datetime import datetime, timedelta

SECRET_KEY = settings.JWT_SECRET
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_access_token(token: str) -> Dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.JWTError:
        return None

Test: Generate OTP, send email, verify OTP, create session
```

---

### Task 6.2: Backend - Auth API Endpoints

**Goal:** Create auth API endpoints

**Prompt:**
```
In /backend, create auth endpoints:

1. In app/api/routes/auth.py:

from fastapi import APIRouter, Response, HTTPException
from app.services.auth_service import AuthService

router = APIRouter()
auth_service = AuthService()

@router.post("/api/auth/request-otp")
async def request_otp(email: str):
    """
    Request OTP for email authentication.
    """
    # Validate email format
    if not is_valid_email(email):
        raise HTTPException(400, "Invalid email format")

    try:
        otp = await auth_service.generate_otp(email)
        await auth_service.send_otp_email(email, otp)
        return {"message": "Verification code sent", "email": email}
    except RateLimitError as e:
        raise HTTPException(429, str(e))

@router.post("/api/auth/verify-otp")
async def verify_otp(email: str, otp: str, response: Response):
    """
    Verify OTP and create session.
    """
    try:
        is_valid = await auth_service.verify_otp(email, otp)

        if not is_valid:
            raise HTTPException(400, "Invalid or expired code")

        # Create session
        session = await auth_service.create_session(email)

        # Set httpOnly cookie for access token
        response.set_cookie(
            key="access_token",
            value=session["access_token"],
            httponly=True,
            secure=True,  # Set to False in dev
            samesite="strict",
            max_age=60 * 60  # 1 hour
        )

        # Set refresh token cookie
        response.set_cookie(
            key="refresh_token",
            value=session["refresh_token"],
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=60 * 60 * 24 * 7  # 7 days
        )

        return {"user": session["user"]}

    except RateLimitError as e:
        raise HTTPException(429, str(e))

@router.post("/api/auth/refresh")
async def refresh_token(response: Response, refresh_token: str = Cookie(None)):
    """
    Refresh access token using refresh token.
    """
    if not refresh_token:
        raise HTTPException(401, "No refresh token")

    new_tokens = await auth_service.refresh_session(refresh_token)

    if not new_tokens:
        raise HTTPException(401, "Invalid refresh token")

    # Set new cookies
    response.set_cookie(
        key="access_token",
        value=new_tokens["access_token"],
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=60 * 60
    )

    return {"success": True}

@router.post("/api/auth/logout")
async def logout(response: Response, refresh_token: str = Cookie(None)):
    """
    Logout and invalidate session.
    """
    if refresh_token:
        await auth_service.invalidate_session(refresh_token)

    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")

    return {"success": True}

@router.get("/api/auth/me")
async def get_current_user(request: Request):
    """
    Get current authenticated user.
    """
    user = await get_current_user_from_request(request)

    if not user:
        raise HTTPException(401, "Not authenticated")

    return {"user": user}

2. In app/core/dependencies.py, add auth dependency:

async def get_current_user_from_request(request: Request) -> Optional[Dict]:
    """
    Extract and verify user from request cookies.
    """
    access_token = request.cookies.get("access_token")

    if not access_token:
        return None

    payload = verify_access_token(access_token)

    if not payload:
        return None

    user_id = payload.get("sub")

    # Get user from database
    result = await supabase.table("users") \
        .select("id, email") \
        .eq("id", user_id) \
        .single() \
        .execute()

    return result.data if result.data else None

3. Include router in main.py

Test: Full auth flow - request OTP, verify, check /me, logout
```

---

### Task 6.3: Frontend - Auth Modal & Store

**Goal:** Create the authentication UI

**Prompt:**
```
In /frontend, create authentication:

1. In src/stores/useAuthStore.ts:

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
);

2. In src/components/auth/AuthModal.tsx:

Create a two-step auth modal:

Step 1 - Email Input:
- ShadCN Dialog
- Title: "Sign in to Clarify"
- Email input field
- "Send Code" button
- Loading state while sending

Step 2 - OTP Verification:
- Shows which email code was sent to
- 6 individual digit inputs (or single input)
- Auto-submit when all digits entered
- "Resend code" link (with cooldown timer)
- "Use different email" link
- Error message for invalid code

Props:
- isOpen: boolean
- onClose: () => void

API calls:
- POST /api/auth/request-otp
- POST /api/auth/verify-otp

On success:
- Update useAuthStore with user
- Close modal
- Show success toast

3. In src/components/layout/Header.tsx:

Update header to include auth:
- If not authenticated: "Sign In" button (opens AuthModal)
- If authenticated:
  - User email (truncated)
  - Dropdown with "Sign Out" option
- Use ShadCN DropdownMenu for user menu

4. In src/lib/api.ts, add auth functions:

export async function requestOTP(email: string) {
  const res = await fetch('/api/auth/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    credentials: 'include'
  });
  return res.json();
}

export async function verifyOTP(email: string, otp: string) {
  const res = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
    credentials: 'include'
  });
  return res.json();
}

export async function logout() {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });
}

export async function getCurrentUser() {
  const res = await fetch('/api/auth/me', {
    credentials: 'include'
  });
  if (!res.ok) return null;
  return res.json();
}

Test: Open modal, enter email, receive code, verify, see logged in state
```

---

### Task 6.4: Frontend - Analysis History Sidebar

**Goal:** Create the history sidebar for authenticated users

**Prompt:**
```
In /frontend, create the history sidebar:

1. In src/components/layout/HistorySidebar.tsx:

Create a collapsible sidebar showing analysis history:

Props:
- isOpen: boolean
- onToggle: () => void

Features:
- Slide in/out animation (Framer Motion)
- Header: "Your Analyses"
- List of past analyses, each showing:
  - Document name(s)
  - Domain badge
  - Score (color-coded)
  - Date (relative: "2 hours ago", "Yesterday")
- Click to navigate to that analysis
- "New Analysis" button at top
- Empty state: "No analyses yet"
- Loading skeleton while fetching
- Pagination: "Load more" button at bottom

Grouping (optional):
- Group by domain
- Or sort by date (most recent first)

Delete functionality:
- Swipe to delete (mobile) or hover to show delete icon
- Confirmation dialog
- DELETE /api/analysis/{id}

2. In src/stores/useUIStore.ts:

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

3. In src/components/layout/AppShell.tsx:

Main layout wrapper:
- Conditionally show sidebar (only if authenticated)
- Sidebar on left (desktop) or overlay (mobile)
- Main content area
- Toggle button in header

4. Add API endpoint for history:

In backend app/api/routes/analysis.py:

@router.get("/api/history")
async def get_analysis_history(
    request: Request,
    limit: int = 10,
    offset: int = 0
):
    user = await get_current_user_from_request(request)
    if not user:
        raise HTTPException(401, "Not authenticated")

    result = await supabase.table("analyses") \
        .select("id, document_names, domain, overall_score, created_at") \
        .eq("user_id", user["id"]) \
        .order("created_at", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()

    return {
        "analyses": result.data,
        "has_more": len(result.data) == limit
    }

@router.delete("/api/analysis/{analysis_id}")
async def delete_analysis(analysis_id: str, request: Request):
    user = await get_current_user_from_request(request)
    if not user:
        raise HTTPException(401, "Not authenticated")

    # Verify ownership
    analysis = await get_analysis(analysis_id)
    if not analysis or analysis["user_id"] != user["id"]:
        raise HTTPException(404, "Analysis not found")

    # Delete (cascades to chunks)
    await supabase.table("analyses").delete().eq("id", analysis_id).execute()

    return {"success": True}

Test: Login, create analysis, verify appears in sidebar, click to view
```

---

## Phase 7: Polish & Optimization

### Task 7.1: Loading States & Skeletons

**Goal:** Add proper loading states throughout the app

**Prompt:**
```
In /frontend, add loading states:

1. Create skeleton components for each major section:

src/components/analysis/ScoreCardSkeleton.tsx:
- Matches ScoreCard layout
- Pulsing circle for score
- Lines for text

src/components/analysis/FindingCardSkeleton.tsx:
- Matches FindingCard layout
- Pulsing badge, title, description areas

src/components/analysis/DocumentSummarySkeleton.tsx:
- Multiple lines of varying length

2. In src/components/ui/loading-state.tsx:

Create a reusable loading wrapper:
- Props: isLoading, skeleton, children
- Shows skeleton when loading, children when loaded
- Smooth transition between states

3. Update pages to use loading states:

- Upload page: Show skeleton while uploading
- Intent page: Show skeleton while fetching intents
- Results page:
  - Initial load: full page skeleton
  - Score: ScoreCardSkeleton
  - Findings: grid of FindingCardSkeleton

4. Processing page improvements:
- More descriptive stage messages
- Subtle animation on the document icon
- Progress bar with smooth transitions

5. Add Suspense boundaries:

In layout.tsx or page.tsx:
import { Suspense } from 'react';

<Suspense fallback={<ResultsPageSkeleton />}>
  <ResultsContent analysisId={id} />
</Suspense>

Test: Slow down API responses, verify all loading states appear correctly
```

---

### Task 7.2: Error Handling & Toast Notifications

**Goal:** Comprehensive error handling with user feedback

**Prompt:**
```
In /frontend, add error handling:

1. Set up Sonner toast provider in layout.tsx:

import { Toaster } from 'sonner';

<Toaster
  position="bottom-right"
  toastOptions={{
    style: { background: 'white' },
    className: 'border'
  }}
/>

2. Create error handling utilities in src/lib/errors.ts:

export function handleApiError(error: unknown): string {
  if (error instanceof Response) {
    switch (error.status) {
      case 400: return 'Invalid request. Please check your input.';
      case 401: return 'Please sign in to continue.';
      case 403: return 'You don\'t have permission to do this.';
      case 404: return 'The requested resource was not found.';
      case 429: return 'Too many requests. Please wait a moment.';
      case 500: return 'Something went wrong. Please try again.';
      default: return 'An unexpected error occurred.';
    }
  }
  return 'An unexpected error occurred.';
}

export function showErrorToast(message: string) {
  toast.error(message, {
    duration: 5000,
    action: {
      label: 'Dismiss',
      onClick: () => {}
    }
  });
}

export function showSuccessToast(message: string) {
  toast.success(message);
}

3. Update API calls to use error handling:

In api.ts:
export async function fetchAnalysis(id: string) {
  try {
    const res = await fetch(`/api/analysis/${id}`, {
      credentials: 'include'
    });

    if (!res.ok) {
      throw res;
    }

    return await res.json();
  } catch (error) {
    const message = handleApiError(error);
    showErrorToast(message);
    throw error;
  }
}

4. Create error boundary component:

src/components/ErrorBoundary.tsx:
- Catches React errors
- Shows friendly error message
- "Try again" button

5. Add specific error states:

Upload errors:
- File too large
- Wrong file type
- Upload failed
- Processing failed

Auth errors:
- Invalid email
- Invalid code
- Rate limited

Analysis errors:
- Analysis not found
- Analysis failed

Test: Trigger various errors, verify toasts appear with correct messages
```

---

### Task 7.3: Animations & Micro-interactions

**Goal:** Add polished animations throughout

**Prompt:**
```
In /frontend, add animations:

1. Create animation utilities in src/lib/animations.ts:

import { Variants } from 'framer-motion';

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

export const scaleOnHover = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 }
};

2. Add page transitions:

In layout.tsx or a wrapper:
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    {children}
  </motion.div>
</AnimatePresence>

3. Add card entrance animations:

In results page finding grid:
<motion.div
  variants={staggerContainer}
  initial="initial"
  animate="animate"
>
  {findings.map((finding, i) => (
    <motion.div key={finding.id} variants={slideUp}>
      <FindingCard finding={finding} />
    </motion.div>
  ))}
</motion.div>

4. Add button interactions:

Update ShadCN Button:
<motion.button {...scaleOnHover}>
  {children}
</motion.button>

5. Score count-up animation:

In ScoreRing:
- Animate number counting from 0 to score
- Use useSpring from framer-motion or custom hook
- Animate SVG stroke simultaneously

6. Sidebar slide animation:

<motion.aside
  initial={{ x: -280 }}
  animate={{ x: isOpen ? 0 : -280 }}
  transition={{ type: 'spring', damping: 20 }}
>

7. Respect reduced motion:

const prefersReducedMotion = usePrefersReducedMotion();
const variants = prefersReducedMotion ? {} : slideUp;

Test: Navigate through app, verify all animations are smooth and not jarring
```

---

### Task 7.4: Mobile Responsiveness

**Goal:** Ensure full mobile support

**Prompt:**
```
In /frontend, optimize for mobile:

1. Update Tailwind breakpoints usage:

Ensure all components use:
- Mobile-first approach
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

2. Upload page mobile:
- Full-width dropzone
- Stack file cards vertically
- Large touch targets for remove buttons

3. Intent selection mobile:
- Single column cards
- Larger touch targets
- Full-width continue button at bottom

4. Results page mobile:
- Stack score card above findings
- Single column for finding cards
- Bottom sheet for red flag detail (not modal)

5. Create MobileSheet component:

Wraps ShadCN Sheet for consistent mobile sheets:
- Slides up from bottom
- Drag to dismiss
- Max height 85vh
- Rounded top corners

6. Update Header for mobile:
- Hamburger menu icon
- Slide-out navigation drawer
- Auth button accessible

7. Update FindingCard for touch:
- Larger tap area
- No hover states (use active state instead)
- Swipe hint for sidebar

8. Test touch interactions:
- All buttons minimum 44x44px
- Adequate spacing between interactive elements
- No hover-dependent functionality

9. Update CSS variables for mobile:

@media (max-width: 640px) {
  :root {
    --card-padding: 1rem;
    --section-spacing: 1.5rem;
  }
}

Test: Use browser dev tools and real mobile device to verify all interactions
```

---

### Task 7.5: Accessibility Audit

**Goal:** Ensure WCAG 2.1 AA compliance

**Prompt:**
```
In /frontend, audit and fix accessibility:

1. Keyboard navigation:
- All interactive elements focusable
- Logical tab order
- Focus visible on all elements
- Escape closes modals/sheets
- Enter/Space activates buttons

2. Screen reader support:

Add aria labels:
- Icon-only buttons: aria-label="Close", "Remove file", etc.
- Score ring: aria-label="Document score: 75 out of 100"
- Severity badges: aria-label="High severity"
- Loading states: aria-busy="true", aria-live="polite"

Add roles where needed:
- role="alert" for error messages
- role="status" for loading messages
- role="navigation" for nav elements

3. Color contrast:
- Verify all text meets 4.5:1 contrast ratio
- Verify large text meets 3:1
- Severity colors + text must be readable
- Don't rely on color alone (add icons)

4. Focus management:
- Focus trap in modals
- Return focus after modal closes
- Focus first element when page loads
- Skip links for keyboard users

5. Form accessibility:
- Labels for all inputs
- Error messages linked to inputs (aria-describedby)
- Required fields marked (aria-required)

6. Dynamic content:
- Announce loading state changes
- Announce new findings loaded
- Announce score when revealed

7. Reduced motion:
- Check prefers-reduced-motion
- Disable/reduce animations
- Instant transitions instead

8. Testing checklist:
- [ ] Navigate entire app with keyboard only
- [ ] Use VoiceOver (Mac) or NVDA (Windows)
- [ ] Run axe DevTools audit
- [ ] Check color contrast with tool
- [ ] Test with 200% zoom

Test: Run axe audit, use screen reader, verify no critical issues
```

---

## Phase 8: Deployment

### Task 8.1: Backend Deployment Preparation

**Goal:** Prepare backend for production deployment

**Prompt:**
```
Prepare /backend for production:

1. Create Dockerfile:

FROM python:3.11-slim

# Install poppler for pdf2image
RUN apt-get update && apt-get install -y \
    poppler-utils \
    tesseract-ocr \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

2. Create docker-compose.yml for local development:

version: '3.8'
services:
  api:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - ./app:/app/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

3. Update config.py for production:

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"

    # Validate required vars in production
    @validator('OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_KEY', 'JWT_SECRET')
    def required_in_prod(cls, v, values):
        if values.get('ENVIRONMENT') == 'production' and not v:
            raise ValueError('Required in production')
        return v

4. Add health check endpoint:

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT
    }

5. Add CORS configuration for production:

origins = [
    "https://clarify.app",
    "https://www.clarify.app",
]

if settings.ENVIRONMENT == "development":
    origins.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

6. Add rate limiting middleware:

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/upload")
@limiter.limit("10/hour")  # Anonymous
async def upload_documents(...):
    ...

7. Deployment options:
- Railway (recommended - easy, good Python support)
- Render
- Google Cloud Run
- AWS ECS

Test: Build Docker image, run locally, verify health endpoint
```

---

### Task 8.2: Frontend Deployment Preparation

**Goal:** Prepare frontend for production deployment

**Prompt:**
```
Prepare /frontend for production:

1. Update next.config.js:

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: [],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

2. Create environment files:

.env.local (development):
NEXT_PUBLIC_API_URL=http://localhost:8000

.env.production:
NEXT_PUBLIC_API_URL=https://api.clarify.app

3. Update API client for production:

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function fetchAPI(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
  });

  if (!res.ok) {
    throw res;
  }

  return res.json();
}

4. Add production error handling:

In src/app/error.tsx:

'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2>Something went wrong</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}

5. Add analytics (optional):

// In layout.tsx
import { Analytics } from '@vercel/analytics/react';

<body>
  {children}
  <Analytics />
</body>

6. Create Dockerfile (if not using Vercel):

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]

7. Deployment options:
- Vercel (recommended - zero config for Next.js)
- Netlify
- Railway
- AWS Amplify

Test: Build production bundle, verify no errors
npm run build
npm start
```

---

### Task 8.3: Environment Variables & Secrets

**Goal:** Document all required environment variables

**Prompt:**
```
Create environment documentation:

1. Create /backend/.env.example:

# Environment
ENVIRONMENT=development  # development | production

# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
RESEND_API_KEY=re_...

# Optional
SENTRY_DSN=  # For error tracking

2. Create /frontend/.env.example:

# API
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional
NEXT_PUBLIC_SENTRY_DSN=

3. Create deployment checklist document:

DEPLOYMENT_CHECKLIST.md:

## Pre-Deployment Checklist

### Backend
- [ ] All environment variables set
- [ ] CORS origins configured for production domain
- [ ] Rate limiting configured
- [ ] Health check endpoint responding
- [ ] Database migrations applied
- [ ] Supabase RLS policies configured

### Frontend
- [ ] API URL environment variable set
- [ ] Build completes without errors
- [ ] All pages load correctly
- [ ] Auth flow works end-to-end
- [ ] Mobile responsive

### Supabase
- [ ] pgvector extension enabled
- [ ] All tables created
- [ ] Indexes created
- [ ] RLS enabled on all tables
- [ ] Service role key kept secret

### Domain & SSL
- [ ] Domain configured
- [ ] SSL certificates active
- [ ] HTTPS enforced

### Monitoring
- [ ] Error tracking (Sentry) configured
- [ ] Health check monitoring
- [ ] Log aggregation

4. Add Supabase RLS policies:

-- Users can only read their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_self ON users FOR ALL USING (id = auth.uid());

-- Users can only access their own analyses
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY analyses_owner ON analyses FOR ALL USING (user_id = auth.uid());

-- Anonymous users can create analyses (user_id NULL)
CREATE POLICY analyses_anonymous ON analyses FOR INSERT WITH CHECK (user_id IS NULL);
```

---

## Summary

This completes the task breakdown for building Clarify. The tasks are organized to:

1. **Build foundational infrastructure first** (Phase 1)
2. **Create the core upload flow** (Phase 2)
3. **Add domain/intent detection** (Phase 3)
4. **Implement the LangGraph analysis engine** (Phase 4)
5. **Build the results UI** (Phase 5)
6. **Add authentication** (Phase 6)
7. **Polish the experience** (Phase 7)
8. **Deploy to production** (Phase 8)

Each task can be executed independently with its prompt. Copy the prompt for each task and use it to implement that specific feature.

**Recommended order:** Complete tasks sequentially within each phase. Phases 1-5 form the MVP. Phases 6-8 add enhancements.

**Testing approach:** Each task includes a "Test:" section. Verify the test passes before moving to the next task.

Good luck building Clarify!
