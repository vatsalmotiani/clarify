# Clarify

AI-powered document clarification platform. Upload contracts, leases, or agreements and get plain-English insights on what matters most.

[Watch Demo](https://drive.google.com/file/d/1z8lXv59ZSPH5GrnTOZckWlxIqBEO0VGG/view?usp=drivesdk)

## Project Structure

```
clarify-code/
├── backend/           # Python FastAPI + LangGraph backend
│   ├── app/
│   │   ├── api/       # API routes
│   │   ├── core/      # Security and dependencies
│   │   ├── graph/     # LangGraph workflow
│   │   ├── models/    # Pydantic schemas
│   │   ├── prompts/   # AI prompts and taxonomies
│   │   └── services/  # Business logic
│   ├── supabase/      # Database schema
│   └── requirements.txt
└── frontend/          # Next.js 14 + ShadCN UI frontend
    └── src/
        ├── app/       # App router pages
        ├── components/# UI components
        ├── hooks/     # Custom React hooks
        ├── lib/       # API client and utilities
        ├── stores/    # Zustand state stores
        └── types/     # TypeScript types
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- Supabase account
- OpenAI API key
- Resend API key (for email OTP)
- Tesseract OCR (for fallback text extraction)

## Setup

### 1. Database Setup (Supabase)

1. Create a new Supabase project
2. Go to SQL Editor and run the schema from `backend/supabase/schema.sql`
3. Enable the pgvector extension if not already enabled
4. Note your project URL and service key

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install Tesseract OCR (optional, for fallback)
# macOS: brew install tesseract
# Ubuntu: sudo apt-get install tesseract-ocr

# Copy environment file and fill in values
cp .env.example .env
# Edit .env with your API keys

# Run the server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local if needed

# Run development server
npm run dev
```

### 4. Environment Variables

**Backend (.env):**
```env
ENVIRONMENT=development
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...
JWT_SECRET=your-secret-key-min-32-chars-change-in-production
RESEND_API_KEY=re_...
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Features

### Document Analysis
- **PDF Upload**: Up to 5 PDFs, max 5MB each
- **Hybrid Text Extraction**: GPT-4o Vision + Tesseract OCR fallback
- **Smart Chunking**: Context-aware text segmentation
- **Vector Embeddings**: text-embedding-3-large for semantic search

### Domain Detection
- Real Estate (buying/selling/offers)
- Employment (contracts/agreements)
- Finance (loans/investments)
- Rental/Lease agreements
- Insurance policies
- Legal agreements

### Analysis Output
- **Overall Score**: 0-100 fairness rating
- **Score Breakdown**: Red flags, completeness, clarity, fairness
- **Red Flags**: Severity-ranked concerns with explanations
- **What-If Scenarios**: Potential situations to consider
- **Key Terms**: Plain-English definitions
- **Missing Clauses**: Expected sections not found

## API Endpoints

### Upload
- `POST /api/upload` - Upload documents (multipart/form-data)

### Analysis
- `POST /api/analysis/{id}/start` - Start analysis workflow
- `GET /api/analysis/{id}/status` - Get current status
- `GET /api/analysis/{id}/intents` - Get domain and intent options
- `POST /api/analysis/{id}/intent` - Select user intent
- `GET /api/analysis/{id}` - Get complete results

### Authentication
- `POST /api/auth/request-otp` - Request email OTP
- `POST /api/auth/verify-otp` - Verify OTP and get token
- `GET /api/auth/me` - Get current user

## Architecture

### LangGraph Workflow

```
Upload → Ingestion → Vectorization → Domain Detection
                                           ↓
                              [User selects intent]
                                           ↓
                                      Analysis → Scoring → Persist → Results
```

### Key Principles

1. **Zero Hallucination**: Every finding cites source text
2. **Fairness Over Fear**: Balanced analysis, not fear-mongering
3. **8th Grade Reading Level**: Plain English explanations
4. **Privacy First**: Documents processed, not stored permanently

## Development

### Running Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### Code Style

- Backend: Black, isort, flake8
- Frontend: ESLint, Prettier

## License

Private - All rights reserved
