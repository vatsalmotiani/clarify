"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, AlertOctagon, AlertCircle, Info, AlertTriangle, MessageSquare, FileEdit, UserCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAnalysisResult } from "@/lib/api";
import type { RedFlag } from "@/types";
import { cn } from "@/lib/utils";

export default function FindingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [finding, setFinding] = useState<RedFlag | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const analysisId = params.id as string;
  const findingId = params.findingId as string;

  useEffect(() => {
    async function loadData() {
      try {
        const result = await getAnalysisResult(analysisId);
        const foundFinding = result.red_flags?.find((f: RedFlag) => f.id === findingId);
        setFinding(foundFinding || null);
      } catch (error) {
        console.error("Failed to load finding:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [analysisId, findingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!finding) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Finding not found</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const severityConfig: Record<string, { icon: typeof AlertOctagon; label: string; color: string; bgColor: string }> = {
    critical: {
      icon: AlertOctagon,
      label: "Critical",
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
    },
    high: {
      icon: AlertCircle,
      label: "High Priority",
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
    medium: {
      icon: AlertTriangle,
      label: "Medium",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    },
    low: {
      icon: Info,
      label: "Low",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    info: {
      icon: Info,
      label: "Info",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
  };

  const config = severityConfig[finding.severity] || severityConfig.medium;
  const SeverityIcon = config.icon;

  // Generate dynamic action cards based on the specific finding
  const generateAskQuestions = (finding: RedFlag): string => {
    const title = finding.title.toLowerCase();
    const questions: string[] = [];

    if (title.includes("termination") || title.includes("cancel")) {
      questions.push(`"What are the specific conditions under which either party can terminate?"`);
      questions.push(`"Is there a notice period required, and can it be negotiated?"`);
      questions.push(`"What happens to any prepaid fees if the contract is terminated early?"`);
    } else if (title.includes("liability") || title.includes("indemnif")) {
      questions.push(`"Can you cap the liability to a specific dollar amount?"`);
      questions.push(`"What insurance coverage do you have for these liabilities?"`);
      questions.push(`"Are there any exclusions to this liability clause?"`);
    } else if (title.includes("auto") && title.includes("renew")) {
      questions.push(`"Can we change this to require active opt-in for renewal?"`);
      questions.push(`"What is the deadline to cancel before auto-renewal?"`);
      questions.push(`"Will you notify me before the renewal date?"`);
    } else if (title.includes("payment") || title.includes("fee") || title.includes("price")) {
      questions.push(`"Are there any hidden fees or additional charges not listed?"`);
      questions.push(`"What happens if I miss a payment deadline?"`);
      questions.push(`"Can the pricing change during the contract term?"`);
    } else if (title.includes("data") || title.includes("privacy") || title.includes("confidential")) {
      questions.push(`"How will my data be stored and protected?"`);
      questions.push(`"Who has access to my information?"`);
      questions.push(`"What happens to my data if I terminate the agreement?"`);
    } else if (title.includes("non-compete") || title.includes("restrict")) {
      questions.push(`"What is the geographic scope of this restriction?"`);
      questions.push(`"How long does this restriction last after the contract ends?"`);
      questions.push(`"What specific activities are prohibited?"`);
    } else {
      questions.push(`"Can you explain why '${finding.title}' is structured this way?"`);
      questions.push(`"Is there flexibility to modify this specific term?"`);
      questions.push(`"What would happen if we removed or changed this clause?"`);
    }

    return `Before signing, ask about "${finding.title}":\n\n${questions.map(q => `• ${q}`).join('\n')}\n\nThese questions help you understand the intent and may reveal room for negotiation.`;
  };

  const generateModifications = (finding: RedFlag): string => {
    const title = finding.title.toLowerCase();
    const severity = finding.severity;
    const modifications: string[] = [];

    if (title.includes("termination") || title.includes("cancel")) {
      modifications.push("Request a mutual termination clause with equal notice periods for both parties");
      modifications.push("Add a 'cure period' allowing time to fix issues before termination");
      modifications.push("Include prorated refund terms for early termination");
    } else if (title.includes("liability") || title.includes("indemnif")) {
      modifications.push("Cap liability to the total contract value or a specific amount");
      modifications.push("Exclude consequential and indirect damages");
      modifications.push("Require the other party to maintain adequate insurance");
    } else if (title.includes("auto") && title.includes("renew")) {
      modifications.push("Change to opt-in renewal requiring written consent");
      modifications.push("Extend the cancellation notice period to 60 or 90 days");
      modifications.push("Add a requirement for renewal reminder notifications");
    } else if (title.includes("payment") || title.includes("fee") || title.includes("price")) {
      modifications.push("Lock in pricing for the full contract term");
      modifications.push("Add a grace period for late payments before penalties apply");
      modifications.push("Cap any price increases to a fixed percentage");
    } else if (title.includes("data") || title.includes("privacy") || title.includes("confidential")) {
      modifications.push("Add specific data deletion requirements upon termination");
      modifications.push("Require notification within 24-48 hours of any data breach");
      modifications.push("Limit data usage to only what's necessary for the service");
    } else if (title.includes("non-compete") || title.includes("restrict")) {
      modifications.push("Narrow the geographic scope to a specific region");
      modifications.push("Reduce the duration of the restriction");
      modifications.push("Add specific carve-outs for your core business activities");
    } else {
      modifications.push(`Request clearer language defining the scope of "${finding.title}"`);
      modifications.push("Add specific limits or boundaries to reduce your exposure");
      modifications.push("Include exceptions for reasonable circumstances");
    }

    const urgencyNote = severity === "critical" || severity === "high"
      ? "\n\n⚠️ Given the severity, strongly consider addressing this before signing."
      : "";

    return `Suggested modifications for "${finding.title}":\n\n${modifications.map(m => `• ${m}`).join('\n')}${urgencyNote}\n\nRemember: Everything is negotiable until signed.`;
  };

  const generateExpertAdvice = (finding: RedFlag): string => {
    const severity = finding.severity;
    const title = finding.title.toLowerCase();

    let professionalType = "a contract attorney";
    if (title.includes("tax") || title.includes("financial")) {
      professionalType = "a tax professional or financial advisor";
    } else if (title.includes("intellectual property") || title.includes("patent") || title.includes("trademark")) {
      professionalType = "an intellectual property attorney";
    } else if (title.includes("employ") || title.includes("non-compete")) {
      professionalType = "an employment lawyer";
    } else if (title.includes("real estate") || title.includes("lease") || title.includes("property")) {
      professionalType = "a real estate attorney";
    }

    const urgencyLevel = severity === "critical"
      ? "This is a critical issue - professional review is strongly recommended before proceeding."
      : severity === "high"
      ? "Given the potential impact, professional advice would be valuable here."
      : "A quick professional review could provide peace of mind.";

    return `For "${finding.title}", consider consulting ${professionalType}.\n\n${urgencyLevel}\n\nA professional can:\n• Explain the full legal implications specific to your situation\n• Suggest alternative language that better protects your interests\n• Identify if this is a standard industry practice or an unusual term\n• Advise on whether this is a deal-breaker or acceptable risk`;
  };

  const actionCards = [
    {
      id: "ask",
      icon: MessageSquare,
      title: "Ask About This",
      description: "Questions to ask before signing",
      color: "bg-blue-50 hover:bg-blue-100 border-blue-200",
      iconColor: "text-blue-600",
      content: generateAskQuestions(finding)
    },
    {
      id: "modify",
      icon: FileEdit,
      title: "Request Changes",
      description: "Suggested modifications",
      color: "bg-purple-50 hover:bg-purple-100 border-purple-200",
      iconColor: "text-purple-600",
      content: generateModifications(finding)
    },
    {
      id: "professional",
      icon: UserCheck,
      title: "Get Expert Help",
      description: "When to seek advice",
      color: "bg-green-50 hover:bg-green-100 border-green-200",
      iconColor: "text-green-600",
      content: generateExpertAdvice(finding)
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Fixed Header - logo stays left */}
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/analysis/${analysisId}`)}
            className="gap-2 mr-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Image src="/logo.jpg" alt="Clarify" width={28} height={28} className="rounded-lg" />
            <span className="font-bold text-[#1E3A5F]">Clarify.</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Title Section - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", config.bgColor)}>
              <SeverityIcon className={cn("w-4 h-4", config.color)} />
            </div>
            <span className={cn("text-sm font-medium", config.color)}>{config.label}</span>
            {finding.page_number != null && finding.page_number > 0 && (
              <span className="text-sm text-muted-foreground">• Source: Page {finding.page_number}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{finding.title}</h1>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-5 gap-6">
          {/* Left Column - Context (2/5) */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-2 space-y-4"
          >
            {/* The Issue */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">The Issue</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{finding.summary}</p>
            </div>

            {/* From Your Document */}
            {finding.source_text && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-2">From Your Document</h2>
                <blockquote className="text-sm bg-muted/50 p-3 rounded-lg border-l-4 border-primary italic text-muted-foreground">
                  &ldquo;{finding.source_text}&rdquo;
                </blockquote>
              </div>
            )}

            {/* Why It Matters */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">Why It Matters</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{finding.explanation}</p>
            </div>
          </motion.div>

          {/* Right Column - Solutions (3/5) */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-3 space-y-4"
          >
            <h2 className="text-sm font-semibold text-foreground">What You Can Do</h2>

            {/* Recommendation */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-foreground leading-relaxed">{finding.recommendation}</p>
            </div>

            {/* Action Cards */}
            <div className="grid gap-3">
              {actionCards.map((action) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden"
                >
                  <button
                    onClick={() => setActiveAction(activeAction === action.id ? null : action.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border transition-all",
                      action.color,
                      activeAction === action.id && "ring-2 ring-primary/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full bg-white flex items-center justify-center", action.iconColor)}>
                        <action.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{action.title}</h3>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                      <ExternalLink className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        activeAction === action.id && "rotate-45"
                      )} />
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {activeAction === action.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-background border border-t-0 rounded-b-lg p-4 -mt-1"
                    >
                      <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                        {action.content}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Back button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 pt-6 border-t"
        >
          <Button
            onClick={() => router.push(`/analysis/${analysisId}`)}
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Analysis
          </Button>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Clarify provides educational insights, not legal advice.
        </p>
      </div>
    </main>
  );
}
