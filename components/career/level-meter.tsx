import { LEVEL_LABELS } from "@/lib/ai/matching";
import { cn } from "@/lib/utils";

/** Three segments: filled up to the user's level, outlined up to the target level. */
export function LevelMeter({ level, target, className }: { level: number; target: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      role="img"
      aria-label={`Your level: ${LEVEL_LABELS[level] ?? "None"}. Target: ${LEVEL_LABELS[target]}.`}
    >
      {[1, 2, 3].map((step) => (
        <span
          key={step}
          className={cn(
            "h-2 w-5 rounded-full",
            step <= level
              ? level >= target
                ? "bg-emerald-500"
                : "bg-sky-500"
              : step <= target
                ? "border border-dashed border-amber-500/70 bg-amber-500/10"
                : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}
