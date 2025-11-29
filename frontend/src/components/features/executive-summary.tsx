"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
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

function getScoreLabel(score: number): string {
  if (score >= 8) return "Looking Good";
  if (score >= 6) return "Needs Attention";
  if (score >= 4) return "Review Carefully";
  return "Significant Concerns";
}


export function ExecutiveSummary({
  score,
  summary,
  findingsCount,
  criticalCount,
}: ExecutiveSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Convert 0-100 score to 1-10
  const displayScore = Math.max(1, Math.round(score / 10));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Horizontal score bar - max 100px height */}
      <div
        className="bg-background border rounded-xl p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        style={{ maxHeight: isExpanded ? "none" : "100px" }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-6 h-20">
          {/* Score - Visually Dominant */}
          <div className="flex items-baseline gap-1 shrink-0">
            <span className={cn("text-6xl font-bold leading-none", getScoreColor(displayScore))}>
              {displayScore}
            </span>
            <span className="text-muted-foreground text-2xl leading-none font-medium">/10</span>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-border shrink-0" />

          {/* Score label and stats */}
          <div className="shrink-0">
            <p className={cn("font-semibold", getScoreColor(displayScore))}>
              {getScoreLabel(displayScore)}
            </p>
            <p className="text-xs text-muted-foreground">
              {findingsCount} finding{findingsCount !== 1 ? "s" : ""}
              {criticalCount > 0 && (
                <span className="text-red-600 ml-1">
                  ({criticalCount} critical)
                </span>
              )}
            </p>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-border shrink-0" />

          {/* Summary preview - truncated with ellipsis */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">
              {summary || "Analysis complete. Review the findings below for detailed insights."}
            </p>
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
              <div className="pt-4 mt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Summary
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {summary || "Analysis complete. Review the findings below for detailed insights."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
