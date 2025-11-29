"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, AlertTriangle, Scale, Eye, Lock } from "lucide-react";
import type { AnalysisStatus } from "@/types";

interface ProcessingStatusProps {
  status: AnalysisStatus;
  progress: number;
  message: string;
}

// Rotating steps with icons and engaging sales facts
const rotatingSteps = [
  {
    icon: Search,
    title: "Scanning for hidden clauses",
    fact: "73% of contracts contain terms that favor one party significantly"
  },
  {
    icon: FileText,
    title: "Looking for buried fees",
    fact: "The average person misses 3-5 important clauses per contract"
  },
  {
    icon: AlertTriangle,
    title: "Identifying red flags",
    fact: "1 in 4 contracts have automatic renewal clauses that catch people off guard"
  },
  {
    icon: Lock,
    title: "Spotting loopholes",
    fact: "Most people spend less than 5 minutes reading contracts they sign"
  },
  {
    icon: Scale,
    title: "Checking for balance",
    fact: "Unfair termination clauses are found in 60% of service agreements"
  },
  {
    icon: Eye,
    title: "Finding what's missing",
    fact: "Key protections are often absent from standard templates"
  },
];

export function ProcessingStatus({
  progress,
}: ProcessingStatusProps) {
  const [stepIndex, setStepIndex] = useState(0);

  // Rotate steps every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % rotatingSteps.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const currentStep = rotatingSteps[stepIndex];
  const CurrentIcon = currentStep.icon;

  return (
    <div className="w-full max-w-xl mx-auto space-y-10">
      {/* Main animated icon that changes */}
      <div className="flex flex-col items-center space-y-8">
        <div className="relative">
          {/* Outer pulsing ring */}
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.2, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ width: 140, height: 140 }}
          />

          {/* Inner circle with changing icon - LARGER */}
          <div className="relative w-[140px] h-[140px] rounded-full bg-primary/10 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={stepIndex}
                initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
                transition={{ duration: 0.3 }}
              >
                <CurrentIcon className="w-16 h-16 text-primary" />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Rotating title - LARGER */}
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.h2
              key={`title-${stepIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-semibold text-foreground"
            >
              {currentStep.title}
            </motion.h2>
          </AnimatePresence>
        </div>
      </div>

      {/* Rotating fact - engaging sales copy */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 min-h-[100px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={`fact-${stepIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <p className="text-sm text-primary font-medium mb-1">Did you know?</p>
            <p className="text-base text-foreground leading-relaxed">
              {currentStep.fact}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
