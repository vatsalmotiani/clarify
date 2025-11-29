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
        "keywords": ["property", "deed", "title", "mortgage", "real estate", "land", "purchase"],
        "description": "Real Estate Documents",
        "intents": [
            {"id": "buyer", "label": "I am buying this property", "description": "You want to purchase and will be the new owner"},
            {"id": "seller", "label": "I am selling this property", "description": "You own the property and are transferring ownership"},
            {"id": "reviewing", "label": "I am reviewing for someone else", "description": "You are helping someone understand this document"},
            {"id": "other", "label": "Other", "description": "My situation is different"}
        ]
    },
    "rental": {
        "keywords": ["lease", "tenant", "landlord", "rent", "premises", "occupancy", "rental"],
        "description": "Rental & Lease Agreements",
        "intents": [
            {"id": "tenant", "label": "I am the tenant signing this lease", "description": "You will be renting and living in the property"},
            {"id": "landlord", "label": "I am the landlord/property owner", "description": "You own the property and are leasing it out"},
            {"id": "reviewing", "label": "I am reviewing for someone else", "description": "You are helping someone understand this document"},
            {"id": "other", "label": "Other", "description": "My situation is different"}
        ]
    },
    "employment": {
        "keywords": ["employee", "employer", "salary", "compensation", "termination", "employment", "job", "hire"],
        "description": "Employment Contracts",
        "intents": [
            {"id": "employee", "label": "I am the employee signing this contract", "description": "You are being hired and will work for this company"},
            {"id": "employer", "label": "I am the employer/company", "description": "You are hiring and this is your contract"},
            {"id": "reviewing", "label": "I am reviewing for someone else", "description": "You are helping someone understand this document"},
            {"id": "other", "label": "Other", "description": "My situation is different"}
        ]
    },
    "finance": {
        "keywords": ["loan", "credit", "interest", "principal", "payment", "financial", "mortgage", "debt"],
        "description": "Financial Documents",
        "intents": [
            {"id": "borrower", "label": "I am the borrower", "description": "You are taking the loan or credit"},
            {"id": "lender", "label": "I am the lender/institution", "description": "You are providing the loan or credit"},
            {"id": "reviewing", "label": "I am reviewing for someone else", "description": "You are helping someone understand this document"},
            {"id": "other", "label": "Other", "description": "My situation is different"}
        ]
    },
    "insurance": {
        "keywords": ["policy", "premium", "coverage", "claim", "insured", "insurance", "deductible"],
        "description": "Insurance Policies",
        "intents": [
            {"id": "policyholder", "label": "I am buying/reviewing this policy", "description": "You are the one being insured"},
            {"id": "beneficiary", "label": "I am a beneficiary", "description": "You are named as a beneficiary on this policy"},
            {"id": "reviewing", "label": "I am reviewing for someone else", "description": "You are helping someone understand this document"},
            {"id": "other", "label": "Other", "description": "My situation is different"}
        ]
    },
    "legal_agreement": {
        "keywords": ["agreement", "contract", "party", "terms", "conditions", "obligations", "nda", "confidential"],
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
                {{"title": "Scenario title", "description": "What could happen"}}
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

# Search queries for each domain to find relevant chunks
DOMAIN_SEARCH_QUERIES = {
    "rental": [
        "rent payment terms",
        "security deposit",
        "termination clause",
        "maintenance responsibilities",
        "late fees penalties"
    ],
    "employment": [
        "compensation salary",
        "termination conditions",
        "non-compete clause",
        "benefits vacation",
        "confidentiality"
    ],
    "real_estate": [
        "purchase price",
        "closing conditions",
        "warranties representations",
        "title transfer",
        "contingencies"
    ],
    "finance": [
        "interest rate",
        "payment schedule",
        "default conditions",
        "prepayment penalty",
        "collateral"
    ],
    "insurance": [
        "coverage limits",
        "exclusions",
        "deductible",
        "claim process",
        "premium payment"
    ],
    "legal_agreement": [
        "obligations duties",
        "termination",
        "liability limitations",
        "confidentiality",
        "dispute resolution"
    ]
}

# Expected clauses for completeness scoring
EXPECTED_CLAUSES = {
    "rental": [
        "rent amount",
        "security deposit",
        "lease term",
        "maintenance",
        "termination",
        "late fees"
    ],
    "employment": [
        "compensation",
        "benefits",
        "termination",
        "confidentiality",
        "duties",
        "start date"
    ],
    "real_estate": [
        "purchase price",
        "closing date",
        "title",
        "contingencies",
        "warranties"
    ],
    "finance": [
        "principal",
        "interest",
        "payment schedule",
        "default",
        "prepayment"
    ],
    "insurance": [
        "coverage",
        "premium",
        "deductible",
        "exclusions",
        "claim"
    ],
    "legal_agreement": [
        "parties",
        "obligations",
        "term",
        "termination",
        "governing law"
    ]
}
