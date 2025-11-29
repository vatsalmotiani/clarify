"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, AlertTriangle, Scale, Eye, Lock } from "lucide-react";
import type { AnalysisStatus } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

interface ProcessingStatusProps {
  status: AnalysisStatus;
  progress: number;
  message: string;
}

// Step icons mapping
const stepIcons = [Search, FileText, AlertTriangle, Lock, Scale, Eye];

export function ProcessingStatus({
  progress,
}: ProcessingStatusProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const { t } = useLanguage();

  // Get translated steps
  const getRotatingSteps = () => [
    {
      icon: Search,
      title: t("processing.steps.scanning"),
      fact: t("processing.steps.scanningFact")
    },
    {
      icon: FileText,
      title: t("processing.steps.lookingFees"),
      fact: t("processing.steps.lookingFeesFact")
    },
    {
      icon: AlertTriangle,
      title: t("processing.steps.identifyingFlags"),
      fact: t("processing.steps.identifyingFlagsFact")
    },
    {
      icon: Lock,
      title: t("processing.steps.spottingLoopholes"),
      fact: t("processing.steps.spottingLoopholesFact")
    },
    {
      icon: Scale,
      title: t("processing.steps.checkingBalance"),
      fact: t("processing.steps.checkingBalanceFact")
    },
    {
      icon: Eye,
      title: t("processing.steps.findingMissing"),
      fact: t("processing.steps.findingMissingFact")
    },
  ];

  const rotatingSteps = getRotatingSteps();

  // Rotate steps every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % 6);
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
            <p className="text-sm text-primary font-medium mb-1">{t("processing.didYouKnow")}</p>
            <p className="text-base text-foreground leading-relaxed">
              {currentStep.fact}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
