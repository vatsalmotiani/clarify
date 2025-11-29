"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface ExecutiveSummaryProps {
  score: number;
  summary: string;
  findingsCount: number;
  criticalCount: number;
}

function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-600";
  if (score >= 6) return "text-yellow-600";
  if (score >= 4) return "text-orange-500";
  return "text-red-600";
}

function getScoreStrokeColor(score: number): string {
  if (score >= 8) return "#16a34a"; // green-600
  if (score >= 6) return "#ca8a04"; // yellow-600
  if (score >= 4) return "#f97316"; // orange-500
  return "#dc2626"; // red-600
}

function getScoreBgColor(score: number): string {
  if (score >= 8) return "bg-green-50 dark:bg-green-950/20";
  if (score >= 6) return "bg-yellow-50 dark:bg-yellow-950/20";
  if (score >= 4) return "bg-orange-50 dark:bg-orange-950/20";
  return "bg-red-50 dark:bg-red-950/20";
}

// Half-circle meter component
function ScoreMeter({ score }: { score: number }) {
  const percentage = (score / 10) * 100;
  const strokeDasharray = 157; // Circumference of half circle (π * r where r = 50)
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

  return (
    <div className="relative w-32 h-16">
      <svg viewBox="0 0 120 60" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 10 55 A 50 50 0 0 1 110 55"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/30"
          strokeLinecap="round"
        />
        {/* Colored arc */}
        <path
          d="M 10 55 A 50 50 0 0 1 110 55"
          fill="none"
          stroke={getScoreStrokeColor(score)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
        />
      </svg>
      {/* Score text centered */}
      <div className="absolute inset-0 flex items-end justify-center pb-1">
        <span className={cn("text-3xl font-bold", getScoreColor(score))}>
          {score}
          <span className="text-3xl font-bold text-muted-foreground">/10</span>
        </span>
      </div>
    </div>
  );
}

export function ExecutiveSummary({
  score,
  summary,
  findingsCount,
  criticalCount,
}: ExecutiveSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useLanguage();

  // Convert 0-100 score to 1-10
  const displayScore = Math.max(1, Math.round(score / 10));

  const getScoreLabel = (score: number): string => {
    if (score >= 8) return t("score.lookingGood");
    if (score >= 6) return t("score.needsAttention");
    if (score >= 4) return t("score.reviewCarefully");
    return t("score.significantConcerns");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        className={cn(
          "border rounded-xl p-5 cursor-pointer hover:shadow-md transition-all",
          getScoreBgColor(displayScore)
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-6">
          {/* Score Meter */}
          <div className="shrink-0">
            <ScoreMeter score={displayScore} />
          </div>

          {/* Score label and stats */}
          <div className="flex-1 min-w-0">
            <p className={cn("text-lg font-semibold mb-1", getScoreColor(displayScore))}>
              {getScoreLabel(displayScore)}
            </p>
            <p className="text-sm text-muted-foreground">
              {findingsCount} {findingsCount !== 1 ? t("results.findings_plural") : t("results.finding")}
              {criticalCount > 0 && (
                <span className="text-red-600 ml-1 font-medium">
                  ({criticalCount} {t("results.critical")})
                </span>
              )}
            </p>
            {/* Summary preview - only show when collapsed */}
            {!isExpanded && summary && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                {summary}
              </p>
            )}
          </div>

          {/* Expand indicator */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </div>

        {/* Expandable summary */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {t("results.summary")}
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {summary || t("results.defaultSummary")}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
