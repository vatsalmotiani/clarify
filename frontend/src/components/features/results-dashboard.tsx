"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, BookOpen, ChevronRight, AlertOctagon, FileDown, Plus, CheckCircle, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExecutiveSummary } from "./executive-summary";
import type { AnalysisResult, RedFlag, KeyTerm } from "@/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface ResultsDashboardProps {
  result: AnalysisResult;
}

export function ResultsDashboard({ result }: ResultsDashboardProps) {
  const router = useRouter();
  const { t } = useLanguage();

  const redFlags = result.red_flags || [];
  const keyTerms = result.key_terms || [];

  // Group findings by severity for Kanban board
  const criticalFindings = redFlags.filter((f) => f.severity === "critical");
  const warningFindings = redFlags.filter((f) => f.severity === "high" || f.severity === "medium");
  const infoFindings = redFlags.filter((f) => f.severity === "low" || f.severity === "info");

  const handleFindingClick = (finding: RedFlag) => {
    router.push(`/analysis/${result.id}/finding/${finding.id}`);
  };

  const handleExportPdf = () => {
    // TODO: Implement PDF export
    window.print();
  };

  const handleStartNew = () => {
    router.push("/");
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Executive Summary */}
      <ExecutiveSummary
        score={result.overall_score}
        summary={result.executive_summary || result.document_summary || ""}
        findingsCount={redFlags.length}
        criticalCount={criticalFindings.length}
      />

      {/* Main content tabs */}
      <Tabs defaultValue="findings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="findings" className="gap-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {t("results.findings")}
            {redFlags.length > 0 && (
              <Badge variant={criticalFindings.length > 0 ? "destructive" : "secondary"} className="ml-1 text-xs">
                {redFlags.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="terms" className="gap-2 text-sm">
            <BookOpen className="w-4 h-4" />
            {t("results.terms")}
          </TabsTrigger>
        </TabsList>

        {/* Findings Tab - Kanban Style */}
        <TabsContent value="findings" className="space-y-4">
          <TabHeader
            title={t("results.findingsTitle")}
            description={t("results.findingsDesc")}
            showAiBadge
          />

          {redFlags.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KanbanColumn
                title={t("results.critical")}
                icon={<AlertOctagon className="w-4 h-4" />}
                findings={criticalFindings}
                onFindingClick={handleFindingClick}
                colorScheme="red"
                emptyMessage={t("results.noCritical")}
                emptyDescription={t("results.noCriticalDesc")}
              />
              <KanbanColumn
                title={t("results.needsReview")}
                icon={<AlertCircle className="w-4 h-4" />}
                findings={warningFindings}
                onFindingClick={handleFindingClick}
                colorScheme="orange"
                emptyMessage={t("results.noWarnings")}
                emptyDescription={t("results.noWarningsDesc")}
              />
              <KanbanColumn
                title={t("results.goodToKnow")}
                icon={<Info className="w-4 h-4" />}
                findings={infoFindings}
                onFindingClick={handleFindingClick}
                colorScheme="blue"
                emptyMessage={t("results.noInfo")}
                emptyDescription={t("results.noInfoDesc")}
              />
            </div>
          ) : (
            <EmptyState
              icon={<CheckCircle className="w-10 h-10 text-green-500" />}
              title={t("results.noIssuesFound")}
              description={t("results.noIssuesDesc")}
            />
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-center pt-4">
            <Button variant="outline" onClick={handleExportPdf} className="gap-2">
              <FileDown className="w-4 h-4" />
              {t("results.exportPdf")}
            </Button>
            <Button onClick={handleStartNew} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("results.startNewAnalysis")}
            </Button>
          </div>
        </TabsContent>

        {/* Key Terms Tab */}
        <TabsContent value="terms" className="space-y-4">
          <TabHeader
            title={t("results.termsTitle")}
            description={t("results.termsDesc")}
          />

          {keyTerms.length > 0 ? (
            <div className="grid gap-4">
              {keyTerms.map((term, index) => (
                <TermItem key={term.term} term={term} index={index} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen className="w-10 h-10" />}
              title={t("results.noSpecialTerms")}
              description={t("results.noSpecialTermsDesc")}
            />
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-center pt-4">
            <Button variant="outline" onClick={handleExportPdf} className="gap-2">
              <FileDown className="w-4 h-4" />
              {t("results.exportPdf")}
            </Button>
            <Button onClick={handleStartNew} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("results.startNewAnalysis")}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TabHeader({ title, description, showAiBadge }: { title: string; description: string; showAiBadge?: boolean }) {
  return (
    <div className="border-b pb-3">
      <h2 className="font-semibold text-foreground flex items-center gap-2">
        {title}
        {showAiBadge && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            AI
          </span>
        )}
      </h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

interface KanbanColumnProps {
  title: string;
  icon: React.ReactNode;
  findings: RedFlag[];
  onFindingClick: (finding: RedFlag) => void;
  colorScheme: "red" | "orange" | "blue";
  emptyMessage?: string;
  emptyDescription?: string;
}

function KanbanColumn({ title, icon, findings, onFindingClick, colorScheme, emptyMessage, emptyDescription }: KanbanColumnProps) {
  const colors = {
    red: {
      header: "bg-red-500 text-white",
      bg: "bg-red-50 dark:bg-red-950/20",
      card: "border-red-500 hover:bg-red-50 dark:hover:bg-red-950/30",
    },
    orange: {
      header: "bg-orange-500 text-white",
      bg: "bg-orange-50 dark:bg-orange-950/20",
      card: "border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30",
    },
    blue: {
      header: "bg-blue-500 text-white",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      card: "border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30",
    },
  };

  const scheme = colors[colorScheme];

  return (
    <div className="flex flex-col">
      <div className={cn("rounded-t-lg px-3 py-2.5 flex items-center gap-2", scheme.header)}>
        {icon}
        <span className="font-medium text-sm">{title}</span>
        {findings.length > 0 && (
          <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {findings.length}
          </span>
        )}
      </div>

      <div className={cn("flex-1 rounded-b-lg p-3 space-y-3 min-h-[180px]", scheme.bg)}>
        {findings.length > 0 ? (
          findings.map((finding, index) => (
            <motion.button
              key={finding.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onFindingClick(finding)}
              className={cn(
                "w-full text-left p-4 bg-background rounded-lg border-l-4 shadow-sm transition-all",
                "hover:shadow-md cursor-pointer group",
                scheme.card
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-medium text-base text-foreground line-clamp-2">
                  {finding.title}
                </h4>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground shrink-0" />
              </div>
            </motion.button>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-2 py-4">
            <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
            <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
            <p className="text-xs text-muted-foreground mt-1">{emptyDescription}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface TermItemProps {
  term: KeyTerm;
  index: number;
}

function TermItem({ term, index }: TermItemProps) {
  // Generate a contextual example based on the term
  const getExample = (termName: string, definition: string): string => {
    // This provides a generic contextual hint - the actual example should come from the LLM
    const lowerTerm = termName.toLowerCase();
    if (lowerTerm.includes("indemnif") || lowerTerm.includes("liability")) {
      return "For example, if a service provider damages your property, this clause determines who pays for repairs.";
    } else if (lowerTerm.includes("terminat") || lowerTerm.includes("cancel")) {
      return "For example, this determines if you can exit a gym membership early without paying the full year.";
    } else if (lowerTerm.includes("renew") || lowerTerm.includes("auto")) {
      return "For example, your streaming subscription might continue charging unless you cancel before the renewal date.";
    } else if (lowerTerm.includes("confidential") || lowerTerm.includes("nda")) {
      return "For example, you cannot share trade secrets or business strategies learned during employment.";
    } else if (lowerTerm.includes("arbitrat") || lowerTerm.includes("dispute")) {
      return "For example, instead of going to court, you might need to resolve issues through a private arbitrator.";
    } else if (lowerTerm.includes("warrant")) {
      return "For example, if a product breaks within the warranty period, the seller must repair or replace it.";
    } else if (lowerTerm.includes("force majeure") || lowerTerm.includes("act of god")) {
      return "For example, if a natural disaster prevents delivery, neither party is held responsible.";
    }
    return "This term affects your rights and obligations under this agreement.";
  };

  const importanceColors = {
    high: "border-l-red-500 bg-red-50/50 dark:bg-red-950/10",
    medium: "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/10",
    low: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "p-5 rounded-lg border-l-4 bg-background shadow-sm",
        importanceColors[term.importance]
      )}
    >
      <div className="flex items-start gap-4">
        <span className="text-lg font-bold text-muted-foreground/50 shrink-0 w-8">
          {index + 1}
        </span>
        <div className="flex-1 space-y-2">
          <dt className="font-semibold text-lg text-foreground">{term.term}</dt>
          <dd className="text-base text-muted-foreground leading-relaxed">{term.definition}</dd>
          <p className="text-sm text-muted-foreground/80 italic border-t pt-2 mt-2">
            {getExample(term.term, term.definition)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="text-center py-10">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground mb-3">
        {icon}
      </div>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
