"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DomainIntents, IntentOption } from "@/types";
import { cn } from "@/lib/utils";

interface IntentSelectorProps {
  domainIntents: DomainIntents;
  onSelect: (intentId: string) => void;
  isLoading?: boolean;
}

const domainDisplayNames: Record<string, string> = {
  real_estate: "Real Estate",
  employment: "Employment",
  finance: "Finance",
  rental: "Rental/Lease",
  insurance: "Insurance",
  legal_agreement: "Legal Agreement",
};

export function IntentSelector({
  domainIntents,
  onSelect,
  isLoading = false,
}: IntentSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (intentId: string) => {
    setSelectedId(intentId);
  };

  const handleContinue = () => {
    if (selectedId) {
      onSelect(selectedId);
    }
  };

  const domainName = domainDisplayNames[domainIntents.domain] || domainIntents.domain;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Fixed size container */}
      <div className="bg-background border rounded-xl p-6 shadow-sm" style={{ minHeight: 400 }}>
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground mb-1">
            Document type: <span className="font-medium text-foreground">{domainName}</span>
          </p>
          <h2 className="text-xl font-semibold">What&apos;s your goal?</h2>
        </div>

        {/* Intent options */}
        <div className="space-y-2 mb-6">
          {domainIntents.intents.map((intent, index) => (
            <IntentCard
              key={intent.id}
              intent={intent}
              isSelected={selectedId === intent.id}
              onSelect={() => handleSelect(intent.id)}
              index={index}
            />
          ))}
        </div>

        {/* Continue button */}
        <Button
          onClick={handleContinue}
          disabled={!selectedId || isLoading}
          className="w-full"
        >
          {isLoading ? "Starting..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}

interface IntentCardProps {
  intent: IntentOption;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}

function IntentCard({ intent, isSelected, onSelect, index }: IntentCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onSelect}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm text-foreground">{intent.label}</p>
        {isSelected && (
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 ml-2" />
        )}
      </div>
    </motion.button>
  );
}
