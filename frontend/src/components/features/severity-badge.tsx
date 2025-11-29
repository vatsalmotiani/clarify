"use client";

import { cn } from "@/lib/utils";
import type { Severity } from "@/types";
import { AlertTriangle, AlertCircle, Info, AlertOctagon, ShieldAlert } from "lucide-react";

interface SeverityBadgeProps {
  severity: Severity;
  showIcon?: boolean;
  size?: "sm" | "md";
}

const severityConfig: Record<
  Severity,
  { label: string; className: string; icon: typeof AlertTriangle }
> = {
  critical: {
    label: "Critical",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: AlertOctagon,
  },
  high: {
    label: "High",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    icon: ShieldAlert,
  },
  medium: {
    label: "Medium",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: AlertTriangle,
  },
  low: {
    label: "Low",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: AlertCircle,
  },
  info: {
    label: "Info",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Info,
  },
};

export function SeverityBadge({
  severity,
  showIcon = true,
  size = "md",
}: SeverityBadgeProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-full",
        config.className,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {showIcon && <Icon className={cn(size === "sm" ? "w-3 h-3" : "w-4 h-4")} />}
      {config.label}
    </span>
  );
}
