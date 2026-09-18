import { Check, Minus, X } from "lucide-react";
import { APPLICATION_STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

const PIPELINE: ApplicationStatus[] = ["applied", "viewed", "screening", "interview", "offer"];

/**
 * Applied → Viewed → Screening → Interview → Offer. Stages the application
 * went through are ticked, stages the employer skipped are dimmed, and
 * Rejected / Withdrawn end the pipeline where it stopped.
 */
export function StatusProgress({ status, reached }: { status: ApplicationStatus; reached: ApplicationStatus[] }) {
  const ended = status === "rejected" || status === "withdrawn";
  const seen = new Set([...reached, status]);
  const furthest = Math.max(...[...seen].map((s) => PIPELINE.indexOf(s)).filter((i) => i >= 0), status === "saved" ? -1 : 0);

  return (
    <ol className="flex items-center" aria-label="Application progress">
      {PIPELINE.map((stage, i) => {
        const passed = i < furthest || (i === furthest && !ended && stage === "offer");
        const skipped = passed && !seen.has(stage);
        const done = passed && !skipped;
        const current = i === furthest && !ended && stage !== "offer";
        const stoppedHere = ended && i === furthest;
        return (
          <li key={stage} className={cn("flex items-center", i < PIPELINE.length - 1 && "flex-1")}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  done && "border-emerald-500 bg-emerald-500 text-white",
                  skipped && "border-dashed border-emerald-500/50 text-emerald-600/70 dark:text-emerald-400/70",
                  current && "border-emerald-500 bg-emerald-500/10 text-emerald-700 ring-4 ring-emerald-500/15 dark:text-emerald-300",
                  stoppedHere && "border-muted-foreground/50 bg-muted text-muted-foreground",
                  !passed && !current && !stoppedHere && "border-border text-muted-foreground",
                )}
                aria-current={current ? "step" : undefined}
                title={skipped ? "Skipped" : undefined}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : skipped ? <Minus className="h-3.5 w-3.5" /> : stoppedHere ? <X className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-[11px] sm:text-xs",
                  done || current ? "font-medium text-foreground" : "text-muted-foreground",
                  skipped && "line-through decoration-muted-foreground/40",
                )}
              >
                {APPLICATION_STATUS_LABELS[stage]}
              </span>
            </div>
            {i < PIPELINE.length - 1 && (
              <span className={cn("mx-1 mb-5 h-0.5 flex-1 rounded-full sm:mx-2", i < furthest ? "bg-emerald-500" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
