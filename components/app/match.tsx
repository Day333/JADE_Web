import { Check, CircleDashed, CircleAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Colour scale shared by every match / readiness percentage. */
export function matchTone(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-teal-600 dark:text-teal-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function matchBg(score: number) {
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/30";
  if (score >= 60) return "bg-teal-500/10 border-teal-500/30";
  if (score >= 40) return "bg-amber-500/10 border-amber-500/30";
  return "bg-muted border-border";
}

/** "Match 86%" pill. */
export function MatchBadge({ score, label = "Match", className }: { score: number; label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        matchBg(score),
        matchTone(score),
        className,
      )}
    >
      {label} {score}%
    </span>
  );
}

export type ChipStatus = "ready" | "have" | "improving" | "missing" | "gap" | "neutral";

/**
 * A skill with its status: ✓ ready / have, ◐ improving, △ missing / gap.
 */
export function SkillChip({ name, status = "neutral", className }: { name: string; status?: ChipStatus; className?: string }) {
  const styles: Record<ChipStatus, string> = {
    ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    have: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    improving: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    missing: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    gap: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    neutral: "border-border bg-secondary text-secondary-foreground",
  };
  const Icon =
    status === "ready" || status === "have"
      ? Check
      : status === "improving"
        ? CircleDashed
        : status === "missing" || status === "gap"
          ? CircleAlert
          : null;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", styles[status], className)}>
      {Icon && <Icon className="h-3 w-3" aria-hidden />}
      {name}
      {status !== "neutral" && (
        <span className="sr-only">
          {status === "ready" || status === "have" ? "(you have this)" : status === "improving" ? "(improving)" : "(gap)"}
        </span>
      )}
    </span>
  );
}

/** Circular readiness / match meter. */
export function ReadinessRing({
  value,
  size = 112,
  stroke = 10,
  label = "Ready",
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(value, 0), 100) / 100);
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="url(#ring-gradient)"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{value}%</span>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

/** Horizontal bar for readiness breakdowns (Skills 80%, Projects 70%…). */
export function MeterRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-[width] duration-700"
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

/** Small "For You" style label used to personalise sections. */
export function ForYouLabel({ children = "For You", className }: { children?: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400",
        className,
      )}
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      {children}
    </span>
  );
}
