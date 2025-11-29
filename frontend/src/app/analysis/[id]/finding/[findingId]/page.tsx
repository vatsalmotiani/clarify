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
import { useLanguage } from "@/context/LanguageContext";

export default function FindingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
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
        <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  if (!finding) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t("finding.findingNotFound")}</p>
        <Button onClick={() => router.back()}>{t("common.goBack")}</Button>
      </div>
    );
  }

  const severityConfig: Record<string, { icon: typeof AlertOctagon; labelKey: string; color: string; bgColor: string }> = {
    critical: {
      icon: AlertOctagon,
      labelKey: "severity.critical",
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
    },
    high: {
      icon: AlertCircle,
      labelKey: "severity.high",
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
    medium: {
      icon: AlertTriangle,
      labelKey: "severity.medium",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    },
    low: {
      icon: Info,
      labelKey: "severity.low",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    info: {
      icon: Info,
      labelKey: "severity.info",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
  };

  const config = severityConfig[finding.severity] || severityConfig.medium;
  const SeverityIcon = config.icon;

  // Generate action card content - use LLM-generated content if available, fallback to templates
  const getAskQuestionsContent = (finding: RedFlag): string => {
    // Use LLM-generated questions if available
    if (finding.questions_to_ask && finding.questions_to_ask.length > 0) {
      return `${t("actions.askQuestions.beforeSigning", { title: finding.title })}\n\n${finding.questions_to_ask.map(q => `• "${q}"`).join('\n')}\n\n${t("actions.askQuestions.helpNegotiate")}`;
    }

    // Fallback to template-based questions
    const title = finding.title.toLowerCase();
    let questions: string[];

    if (title.includes("termination") || title.includes("cancel")) {
      questions = [t("actions.askQuestions.termination.q1"), t("actions.askQuestions.termination.q2"), t("actions.askQuestions.termination.q3")];
    } else if (title.includes("liability") || title.includes("indemnif")) {
      questions = [t("actions.askQuestions.liability.q1"), t("actions.askQuestions.liability.q2"), t("actions.askQuestions.liability.q3")];
    } else if (title.includes("auto") && title.includes("renew")) {
      questions = [t("actions.askQuestions.autoRenew.q1"), t("actions.askQuestions.autoRenew.q2"), t("actions.askQuestions.autoRenew.q3")];
    } else if (title.includes("payment") || title.includes("fee") || title.includes("price")) {
      questions = [t("actions.askQuestions.payment.q1"), t("actions.askQuestions.payment.q2"), t("actions.askQuestions.payment.q3")];
    } else if (title.includes("data") || title.includes("privacy") || title.includes("confidential")) {
      questions = [t("actions.askQuestions.data.q1"), t("actions.askQuestions.data.q2"), t("actions.askQuestions.data.q3")];
    } else if (title.includes("non-compete") || title.includes("restrict")) {
      questions = [t("actions.askQuestions.nonCompete.q1"), t("actions.askQuestions.nonCompete.q2"), t("actions.askQuestions.nonCompete.q3")];
    } else {
      questions = [
        t("actions.askQuestions.generic.q1", { title: finding.title }),
        t("actions.askQuestions.generic.q2"),
        t("actions.askQuestions.generic.q3")
      ];
    }

    return `${t("actions.askQuestions.beforeSigning", { title: finding.title })}\n\n${questions.map(q => `• ${q}`).join('\n')}\n\n${t("actions.askQuestions.helpNegotiate")}`;
  };

  const getModificationsContent = (finding: RedFlag): string => {
    const severity = finding.severity;

    // Use LLM-generated modifications if available
    if (finding.suggested_changes && finding.suggested_changes.length > 0) {
      const urgencyNote = severity === "critical" || severity === "high"
        ? `\n\n${t("actions.modifications.severityWarning")}`
        : "";
      return `${t("actions.modifications.suggestedFor", { title: finding.title })}\n\n${finding.suggested_changes.map(m => `• ${m}`).join('\n')}${urgencyNote}\n\n${t("actions.modifications.rememberNegotiable")}`;
    }

    // Fallback to template-based modifications
    const title = finding.title.toLowerCase();
    let modifications: string[];

    if (title.includes("termination") || title.includes("cancel")) {
      modifications = [t("actions.modifications.termination.m1"), t("actions.modifications.termination.m2"), t("actions.modifications.termination.m3")];
    } else if (title.includes("liability") || title.includes("indemnif")) {
      modifications = [t("actions.modifications.liability.m1"), t("actions.modifications.liability.m2"), t("actions.modifications.liability.m3")];
    } else if (title.includes("auto") && title.includes("renew")) {
      modifications = [t("actions.modifications.autoRenew.m1"), t("actions.modifications.autoRenew.m2"), t("actions.modifications.autoRenew.m3")];
    } else if (title.includes("payment") || title.includes("fee") || title.includes("price")) {
      modifications = [t("actions.modifications.payment.m1"), t("actions.modifications.payment.m2"), t("actions.modifications.payment.m3")];
    } else if (title.includes("data") || title.includes("privacy") || title.includes("confidential")) {
      modifications = [t("actions.modifications.data.m1"), t("actions.modifications.data.m2"), t("actions.modifications.data.m3")];
    } else if (title.includes("non-compete") || title.includes("restrict")) {
      modifications = [t("actions.modifications.nonCompete.m1"), t("actions.modifications.nonCompete.m2"), t("actions.modifications.nonCompete.m3")];
    } else {
      modifications = [
        t("actions.modifications.generic.m1", { title: finding.title }),
        t("actions.modifications.generic.m2"),
        t("actions.modifications.generic.m3")
      ];
    }

    const urgencyNote = severity === "critical" || severity === "high"
      ? `\n\n${t("actions.modifications.severityWarning")}`
      : "";

    return `${t("actions.modifications.suggestedFor", { title: finding.title })}\n\n${modifications.map(m => `• ${m}`).join('\n')}${urgencyNote}\n\n${t("actions.modifications.rememberNegotiable")}`;
  };

  const getExpertAdviceContent = (finding: RedFlag): string => {
    const severity = finding.severity;

    // Use LLM-generated professional advice if available
    if (finding.professional_advice) {
      const urgency = severity === "critical"
        ? t("actions.expertAdvice.urgency.critical")
        : severity === "high"
        ? t("actions.expertAdvice.urgency.high")
        : t("actions.expertAdvice.urgency.default");

      return `${finding.professional_advice}\n\n${urgency}\n\n${t("actions.expertAdvice.professionalCan")}\n• ${t("actions.expertAdvice.benefits.b1")}\n• ${t("actions.expertAdvice.benefits.b2")}\n• ${t("actions.expertAdvice.benefits.b3")}\n• ${t("actions.expertAdvice.benefits.b4")}`;
    }

    // Fallback to template-based expert advice
    const title = finding.title.toLowerCase();

    let professionalKey = "contractAttorney";
    if (title.includes("tax") || title.includes("financial")) {
      professionalKey = "taxProfessional";
    } else if (title.includes("intellectual property") || title.includes("patent") || title.includes("trademark")) {
      professionalKey = "ipAttorney";
    } else if (title.includes("employ") || title.includes("non-compete")) {
      professionalKey = "employmentLawyer";
    } else if (title.includes("real estate") || title.includes("lease") || title.includes("property")) {
      professionalKey = "realEstateLawyer";
    }

    const professional = t(`actions.expertAdvice.professionals.${professionalKey}`);
    const urgency = severity === "critical"
      ? t("actions.expertAdvice.urgency.critical")
      : severity === "high"
      ? t("actions.expertAdvice.urgency.high")
      : t("actions.expertAdvice.urgency.default");

    return `${t("actions.expertAdvice.considerConsulting", { title: finding.title, professional })}\n\n${urgency}\n\n${t("actions.expertAdvice.professionalCan")}\n• ${t("actions.expertAdvice.benefits.b1")}\n• ${t("actions.expertAdvice.benefits.b2")}\n• ${t("actions.expertAdvice.benefits.b3")}\n• ${t("actions.expertAdvice.benefits.b4")}`;
  };

  const actionCards = [
    {
      id: "ask",
      icon: MessageSquare,
      title: t("finding.askAboutThis"),
      description: t("finding.askAboutThisDesc"),
      color: "bg-blue-50 hover:bg-blue-100 border-blue-200",
      iconColor: "text-blue-600",
      content: getAskQuestionsContent(finding)
    },
    {
      id: "modify",
      icon: FileEdit,
      title: t("finding.requestChanges"),
      description: t("finding.requestChangesDesc"),
      color: "bg-purple-50 hover:bg-purple-100 border-purple-200",
      iconColor: "text-purple-600",
      content: getModificationsContent(finding)
    },
    {
      id: "professional",
      icon: UserCheck,
      title: t("finding.getExpertHelp"),
      description: t("finding.getExpertHelpDesc"),
      color: "bg-green-50 hover:bg-green-100 border-green-200",
      iconColor: "text-green-600",
      content: getExpertAdviceContent(finding)
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Fixed Header - logo stays left */}
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/analysis/${analysisId}`)}
              className="gap-2 mr-4"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("common.back")}
            </Button>
            <div className="flex items-center gap-2">
              <Image src="/logo.jpg" alt="Clarify" width={28} height={28} className="rounded-lg" />
              <span className="font-bold text-[#1E3A5F]">{t("common.clarify")}</span>
            </div>
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
            <span className={cn("text-sm font-medium", config.color)}>{t(config.labelKey)}</span>
            {finding.page_number != null && finding.page_number > 0 && (
              <span className="text-sm text-muted-foreground">• {t("finding.sourcePage", { page: finding.page_number })}</span>
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
              <h2 className="text-sm font-semibold text-foreground mb-2">{t("finding.theIssue")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{finding.summary}</p>
            </div>

            {/* From Your Document */}
            {finding.source_text && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-2">{t("finding.fromYourDocument")}</h2>
                <blockquote className="text-sm bg-muted/50 p-3 rounded-lg border-l-4 border-primary italic text-muted-foreground">
                  &ldquo;{finding.source_text}&rdquo;
                </blockquote>
              </div>
            )}

            {/* Why It Matters */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-2">{t("finding.whyItMatters")}</h2>
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
            <h2 className="text-sm font-semibold text-foreground">{t("finding.whatYouCanDo")}</h2>

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
            {t("analysis.backToAnalysis")}
          </Button>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {t("home.footer")}
        </p>
      </div>
    </main>
  );
}
