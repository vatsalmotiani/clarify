"use client";

import { motion } from "framer-motion";
import { ChevronRight, FileText } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SeverityBadge } from "./severity-badge";
import type { RedFlag } from "@/types";
import { cn } from "@/lib/utils";

interface FindingCardProps {
  finding: RedFlag;
  onClick?: () => void;
  index?: number;
}

export function FindingCard({ finding, onClick, index = 0 }: FindingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30",
          onClick && "hover:bg-muted/30"
        )}
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight mb-2">
                {finding.title}
              </h3>
              <SeverityBadge severity={finding.severity} size="sm" />
            </div>
            {onClick && (
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {finding.summary}
          </p>
          {finding.page_number && (
            <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
              <FileText className="w-3 h-3" />
              <span>Page {finding.page_number}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface FindingDetailProps {
  finding: RedFlag;
  onClose?: () => void;
}

export function FindingDetail({ finding }: FindingDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <SeverityBadge severity={finding.severity} />
        <h2 className="text-xl font-semibold">{finding.title}</h2>
      </div>

      {/* Summary */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Summary
        </h3>
        <p className="text-foreground">{finding.summary}</p>
      </div>

      {/* Source text */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          From Your Document
        </h3>
        <blockquote className="border-l-4 border-primary pl-4 py-2 bg-muted/50 rounded-r-lg">
          <p className="text-sm italic">&ldquo;{finding.source_text}&rdquo;</p>
          {finding.page_number && (
            <p className="text-xs text-muted-foreground mt-2">
              Page {finding.page_number}
            </p>
          )}
        </blockquote>
      </div>

      {/* Explanation */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Why This Matters
        </h3>
        <p className="text-foreground">{finding.explanation}</p>
      </div>

      {/* Recommendation */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          What You Can Do
        </h3>
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-foreground">{finding.recommendation}</p>
        </div>
      </div>
    </div>
  );
}
