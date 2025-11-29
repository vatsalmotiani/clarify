"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProcessingStatus } from "@/components/features/processing-status";
import { IntentSelector } from "@/components/features/intent-selector";
import { ResultsDashboard } from "@/components/features/results-dashboard";
import {
  getAnalysisStatus,
  getIntents,
  selectIntent,
  getAnalysisResult,
} from "@/lib/api";
import { useAnalysisStore } from "@/stores/analysis-store";
import { usePolling } from "@/hooks/use-polling";
import type { AnalysisStatus } from "@/types";

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = params.id as string;

  const {
    status,
    progress,
    statusMessage,
    domainIntents,
    result,
    setStatus,
    setDomainIntents,
    setResult,
    setError,
  } = useAnalysisStore();

  const [isSelectingIntent, setIsSelectingIntent] = useState(false);

  // Determine if we should poll
  const shouldPoll =
    status !== null &&
    status !== "awaiting_intent" &&
    status !== "complete" &&
    status !== "error";

  // Poll for status updates
  const handlePoll = useCallback(async (): Promise<boolean> => {
    try {
      const statusResponse = await getAnalysisStatus(analysisId);
      setStatus(
        statusResponse.status,
        statusResponse.progress,
        statusResponse.message
      );

      // If awaiting intent, fetch intents
      if (statusResponse.status === "awaiting_intent") {
        const intents = await getIntents(analysisId);
        setDomainIntents(intents);
        return true; // Stop polling
      }

      // If complete, fetch results
      if (statusResponse.status === "complete") {
        const analysisResult = await getAnalysisResult(analysisId);
        setResult(analysisResult);
        return true; // Stop polling
      }

      // If error, stop polling
      if (statusResponse.status === "error") {
        setError(statusResponse.message);
        return true; // Stop polling
      }

      return false; // Continue polling
    } catch (err) {
      console.error("Polling error:", err);
      return false; // Continue polling on error
    }
  }, [analysisId, setStatus, setDomainIntents, setResult, setError]);

  usePolling({
    interval: 2000,
    enabled: shouldPoll,
    onPoll: handlePoll,
  });

  // Initial fetch on mount
  useEffect(() => {
    if (!status) {
      handlePoll();
    }
  }, [status, handlePoll]);

  const handleIntentSelect = async (intentId: string) => {
    setIsSelectingIntent(true);
    try {
      await selectIntent(analysisId, intentId);
      setStatus("analyzing", 50, "Analyzing your documents...");
    } catch (err) {
      console.error("Intent selection error:", err);
      setError("Failed to select intent. Please try again.");
    } finally {
      setIsSelectingIntent(false);
    }
  };

  const handleBack = () => {
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Image
                src="/logo.jpg"
                alt="Clarify"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="text-xl font-bold text-[#1E3A5F]">Clarify.</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Processing state */}
          {status && status !== "awaiting_intent" && status !== "complete" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-16"
            >
              <ProcessingStatus
                status={status as AnalysisStatus}
                progress={progress}
                message={statusMessage}
              />
            </motion.div>
          )}

          {/* Intent selection state */}
          {status === "awaiting_intent" && domainIntents && (
            <motion.div
              key="intent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8"
            >
              <IntentSelector
                domainIntents={domainIntents}
                onSelect={handleIntentSelect}
                isLoading={isSelectingIntent}
              />
            </motion.div>
          )}

          {/* Results state */}
          {status === "complete" && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ResultsDashboard result={result} />
            </motion.div>
          )}

          {/* Error state */}
          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-16 text-center"
            >
              <h2 className="text-2xl font-semibold text-destructive mb-4">
                Something went wrong
              </h2>
              <p className="text-muted-foreground mb-6">{statusMessage}</p>
              <Button onClick={handleBack}>Try Again</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
