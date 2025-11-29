"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, BookOpen, HelpCircle, ChevronRight, AlertOctagon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ExecutiveSummary } from "./executive-summary";
import type { AnalysisResult, RedFlag, Scenario, KeyTerm } from "@/types";
import { cn } from "@/lib/utils";

interface ResultsDashboardProps {
  result: AnalysisResult;
}

// Category descriptions
const categoryDescriptions = {
  findings: {
    title: "Issues That Need Your Attention",
    description: "Click any item to understand what it means for you.",
  },
  scenarios: {
    title: "What Could Happen",
    description: "Real situations you might face based on this document.",
  },
  terms: {
    title: "Words You Should Know",
    description: "Legal terms explained simply.",
  },
};

export function ResultsDashboard({ result }: ResultsDashboardProps) {
  const router = useRouter();

  const redFlags = result.red_flags || [];
  const scenarios = result.scenarios || [];
  const keyTerms = result.key_terms || [];

  // Group findings by severity for Kanban board
  const criticalFindings = redFlags.filter((f) => f.severity === "critical");
  const warningFindings = redFlags.filter((f) => f.severity === "high" || f.severity === "medium");
  const infoFindings = redFlags.filter((f) => f.severity === "low" || f.severity === "info");

  const handleFindingClick = (finding: RedFlag) => {
    router.push(`/analysis/${result.id}/finding/${finding.id}`);
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
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="findings" className="gap-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            Findings
            {redFlags.length > 0 && (
              <Badge variant={criticalFindings.length > 0 ? "destructive" : "secondary"} className="ml-1 text-xs">
                {redFlags.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="gap-2 text-sm">
            <HelpCircle className="w-4 h-4" />
            Scenarios
          </TabsTrigger>
          <TabsTrigger value="terms" className="gap-2 text-sm">
            <BookOpen className="w-4 h-4" />
            Terms
          </TabsTrigger>
        </TabsList>

        {/* Findings Tab - Kanban Style */}
        <TabsContent value="findings" className="space-y-4">
          <TabHeader
            title={categoryDescriptions.findings.title}
            description={categoryDescriptions.findings.description}
          />

          {redFlags.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <KanbanColumn
                title="Critical"
                icon={<AlertOctagon className="w-4 h-4" />}
                findings={criticalFindings}
                onFindingClick={handleFindingClick}
                colorScheme="red"
              />
              <KanbanColumn
                title="Needs Review"
                icon={<AlertCircle className="w-4 h-4" />}
                findings={warningFindings}
                onFindingClick={handleFindingClick}
                colorScheme="orange"
              />
              <KanbanColumn
                title="Good to Know"
                icon={<Info className="w-4 h-4" />}
                findings={infoFindings}
                onFindingClick={handleFindingClick}
                colorScheme="blue"
              />
            </div>
          ) : (
            <EmptyState
              icon={<AlertTriangle className="w-10 h-10" />}
              title="No Issues Found"
              description="We didn't find any concerning clauses."
            />
          )}
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-4">
          <TabHeader
            title={categoryDescriptions.scenarios.title}
            description={categoryDescriptions.scenarios.description}
          />

          {scenarios.length > 0 ? (
            <div className="space-y-3">
              {scenarios.map((scenario, index) => (
                <ScenarioItem key={scenario.id} scenario={scenario} index={index} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<HelpCircle className="w-10 h-10" />}
              title="No Scenarios"
              description="No specific scenarios identified."
            />
          )}
        </TabsContent>

        {/* Key Terms Tab - No colors */}
        <TabsContent value="terms" className="space-y-4">
          <TabHeader
            title={categoryDescriptions.terms.title}
            description={categoryDescriptions.terms.description}
          />

          {keyTerms.length > 0 ? (
            <div className="space-y-0 divide-y">
              {keyTerms.map((term, index) => (
                <TermItem key={term.term} term={term} index={index} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen className="w-10 h-10" />}
              title="No Special Terms"
              description="This document uses straightforward language."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TabHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b pb-3">
      <h2 className="font-semibold text-foreground">{title}</h2>
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
}

function KanbanColumn({ title, icon, findings, onFindingClick, colorScheme }: KanbanColumnProps) {
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
      <div className={cn("rounded-t-lg px-3 py-2 flex items-center gap-2", scheme.header)}>
        {icon}
        <span className="font-medium text-sm">{title}</span>
        {findings.length > 0 && (
          <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {findings.length}
          </span>
        )}
      </div>

      <div className={cn("flex-1 rounded-b-lg p-2 space-y-2 min-h-[150px]", scheme.bg)}>
        {findings.length > 0 ? (
          findings.map((finding, index) => (
            <motion.button
              key={finding.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onFindingClick(finding)}
              className={cn(
                "w-full text-left p-4 bg-background rounded-lg border-l-4 shadow-sm transition-all min-h-[80px]",
                "hover:shadow-md cursor-pointer group",
                scheme.card
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-foreground line-clamp-2 mb-1">
                    {finding.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {finding.summary}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground shrink-0 mt-1" />
              </div>
            </motion.button>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            None
          </div>
        )}
      </div>
    </div>
  );
}

interface ScenarioItemProps {
  scenario: Scenario;
  index: number;
}

function ScenarioItem({ scenario, index }: ScenarioItemProps) {
  const likelihoodLabels: Record<string, string> = {
    likely: "Likely",
    possible: "Possible",
    unlikely: "Unlikely",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-muted/30 rounded-lg p-3"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm text-foreground">{scenario.title}</h4>
            <span className="text-xs text-muted-foreground">
              ({likelihoodLabels[scenario.likelihood] || scenario.likelihood})
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{scenario.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

interface TermItemProps {
  term: KeyTerm;
  index: number;
}

function TermItem({ term, index }: TermItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
      className="py-3 flex gap-3"
    >
      <span className="text-sm font-medium text-muted-foreground shrink-0 w-6">
        {index + 1}.
      </span>
      <div className="flex-1">
        <dt className="font-medium text-foreground text-sm">{term.term}</dt>
        <dd className="text-sm text-muted-foreground mt-0.5">{term.definition}</dd>
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
