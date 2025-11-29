// Analysis types
export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type AnalysisStatus =
  | "uploading"
  | "processing"
  | "detecting_domain"
  | "domain_detection"
  | "waiting_for_intent"
  | "awaiting_intent"
  | "analyzing"
  | "scoring"
  | "persist"
  | "complete"
  | "error";

export interface FileMetadata {
  filename: string;
  size: number;
  mime_type: string;
  page_count?: number;
  openai_file_id?: string;
}

export interface RedFlag {
  id: string;
  title: string;
  severity: Severity;
  summary: string;
  explanation: string;
  source_text: string;
  page_number: number;
  recommendation: string;
  questions_to_ask?: string[];
  suggested_changes?: string[];
  professional_advice?: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  likelihood: "likely" | "possible" | "unlikely";
  impact: Severity;
}

export interface KeyTerm {
  term: string;
  definition: string;
  importance: "high" | "medium" | "low";
}

export interface ScoreComponents {
  red_flag_score: number;
  completeness_score: number;
  clarity_score: number;
  fairness_score: number;
}

export interface AnalysisResult {
  id: string;
  status: AnalysisStatus;
  domain: string;
  intent: string;
  overall_score: number;
  score_components: ScoreComponents;
  executive_summary?: string;
  document_summary?: string;
  red_flags: RedFlag[];
  scenarios?: Scenario[];
  key_terms: KeyTerm[];
  main_obligations?: string[];
  missing_clauses?: string[];
  positive_notes?: string[];
  follow_up_questions?: string[];
  document_metadata?: FileMetadata[];
  document_names?: string[];
  openai_file_ids?: string[];
  created_at: string;
  completed_at?: string;
}

export interface IntentOption {
  id: string;
  label: string;
  description: string;
}

export interface DomainIntents {
  domain: string;
  domain_confidence: number;
  intents: IntentOption[];
}

export interface UploadResponse {
  analysis_id: string;
  files: FileMetadata[];
  message: string;
}

export interface StatusResponse {
  status: AnalysisStatus;
  progress: number;
  message: string;
}

// User types
export interface User {
  id: string;
  email: string;
  created_at: string;
}

// History types
export interface AnalysisHistoryItem {
  id: string;
  domain: string;
  intent: string;
  overall_score: number;
  status: AnalysisStatus;
  created_at: string;
  document_names: string[];
}
