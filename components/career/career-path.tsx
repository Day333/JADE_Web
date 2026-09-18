import { ChevronRight, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

/** Typical progression for a career, e.g. Intern → Junior → … → Lead. */
export function CareerPath({ steps, className }: { steps: string[]; className?: string }) {
  if (steps.length === 0) return null;
  return (
    <ol className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      {steps.map((step, i) => {
        const first = i === 0;
        const last = i === steps.length - 1;
        return (
          <li key={`${step}-${i}`} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                first
                  ? "border-emerald-500/40 bg-emerald-500/10 font-medium text-emerald-800 dark:text-emerald-200"
                  : last
                    ? "border-teal-500/30 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 font-medium"
                    : "bg-card",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                  first ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950" : "bg-muted text-muted-foreground",
                )}
              >
                {last ? <Flag className="h-3 w-3" aria-hidden /> : i + 1}
              </span>
              <span>{step}</span>
              {first && <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Entry</span>}
            </div>
            {!last && <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
