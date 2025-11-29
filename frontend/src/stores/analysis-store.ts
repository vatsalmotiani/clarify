import { create } from "zustand";
import type {
  AnalysisStatus,
  AnalysisResult,
  DomainIntents,
  FileMetadata,
} from "@/types";

interface AnalysisState {
  // Current analysis
  analysisId: string | null;
  status: AnalysisStatus | null;
  progress: number;
  statusMessage: string;

  // Uploaded files
  uploadedFiles: FileMetadata[];

  // Domain and intent selection
  domainIntents: DomainIntents | null;
  selectedIntent: string | null;

  // Analysis result
  result: AnalysisResult | null;

  // Error state
  error: string | null;

  // Actions
  setAnalysisId: (id: string) => void;
  setStatus: (status: AnalysisStatus, progress: number, message: string) => void;
  setUploadedFiles: (files: FileMetadata[]) => void;
  setDomainIntents: (intents: DomainIntents) => void;
  setSelectedIntent: (intentId: string) => void;
  setResult: (result: AnalysisResult) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  analysisId: null,
  status: null,
  progress: 0,
  statusMessage: "",
  uploadedFiles: [],
  domainIntents: null,
  selectedIntent: null,
  result: null,
  error: null,
};

export const useAnalysisStore = create<AnalysisState>((set) => ({
  ...initialState,

  setAnalysisId: (id) => set({ analysisId: id }),

  setStatus: (status, progress, message) =>
    set({ status, progress, statusMessage: message }),

  setUploadedFiles: (files) => set({ uploadedFiles: files }),

  setDomainIntents: (intents) => set({ domainIntents: intents }),

  setSelectedIntent: (intentId) => set({ selectedIntent: intentId }),

  setResult: (result) => set({ result }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
