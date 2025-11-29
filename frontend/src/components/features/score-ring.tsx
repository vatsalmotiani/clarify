"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
}

const sizeConfig = {
  sm: { ring: 80, stroke: 6, fontSize: "text-lg" },
  md: { ring: 120, stroke: 8, fontSize: "text-2xl" },
  lg: { ring: 180, stroke: 10, fontSize: "text-4xl" },
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Concerning";
  return "Poor";
}

function getStrokeColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green-500
  if (score >= 60) return "#eab308"; // yellow-500
  if (score >= 40) return "#f97316"; // orange-500
  return "#ef4444"; // red-500
}

export function ScoreRing({
  score,
  size = "md",
  showLabel = true,
  animated = true,
}: ScoreRingProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const config = sizeConfig[size];
  const radius = (config.ring - config.stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (displayScore / 100) * circumference;

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }

    const duration = 1500;
    const startTime = Date.now();
    const startValue = displayScore;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (score - startValue) * easeOut;

      setDisplayScore(Math.round(currentValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score, animated, displayScore]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={config.ring}
        height={config.ring}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.ring / 2}
          cy={config.ring / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={config.stroke}
          fill="none"
          className="text-muted"
        />
        {/* Progress circle */}
        <motion.circle
          cx={config.ring / 2}
          cy={config.ring / 2}
          r={radius}
          stroke={getStrokeColor(score)}
          strokeWidth={config.stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          initial={animated ? { strokeDashoffset: circumference } : undefined}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>

      {/* Score display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(config.fontSize, "font-bold", getScoreColor(score))}>
          {displayScore}
        </span>
        {showLabel && (
          <span className="text-xs text-muted-foreground mt-1">
            {getScoreLabel(score)}
          </span>
        )}
      </div>
    </div>
  );
}

interface ScoreBreakdownProps {
  components: {
    red_flag_score: number;
    completeness_score: number;
    clarity_score: number;
    fairness_score: number;
  };
}

export function ScoreBreakdown({ components }: ScoreBreakdownProps) {
  const items = [
    { label: "Red Flags", score: components.red_flag_score, description: "Absence of concerning clauses" },
    { label: "Completeness", score: components.completeness_score, description: "Presence of expected sections" },
    { label: "Clarity", score: components.clarity_score, description: "Language readability" },
    { label: "Fairness", score: components.fairness_score, description: "Balance of terms" },
  ];

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{item.label}</span>
            <span className={cn("font-semibold", getScoreColor(item.score))}>
              {item.score}
            </span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${item.score}%` }}
              transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: getStrokeColor(item.score) }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{item.description}</p>
        </motion.div>
      ))}
    </div>
  );
}
