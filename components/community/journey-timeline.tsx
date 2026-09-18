import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineEntry {
  id: string;
  year: number;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  /** Visually highlight (e.g. the entry being edited). */
  highlight?: boolean;
}

/** Sorts entries oldest first (stable for entries in the same year). */
export function sortJourney<T extends { year: number }>(entries: T[]) {
  return entries.map((e, i) => ({ e, i })).sort((a, b) => a.e.year - b.e.year || a.i - b.i).map(({ e }) => e);
}

/**
 * Vertical Career Journey timeline:
 * 2024 Bachelor of Computer Science → 2025 Data Analyst Intern → …
 * Future years are shown as planned steps.
 */
export function JourneyTimeline({
  entries,
  currentYear,
  compact = false,
  className,
}: {
  entries: TimelineEntry[];
  /** Pass the current year from the server so server and client render the same thing. */
  currentYear: number;
  compact?: boolean;
  className?: string;
}) {
  const sorted = sortJourney(entries);
  return (
    <ol className={cn("relative", className)}>
      {sorted.map((entry, index) => {
        const planned = entry.year > currentYear;
        const last = index === sorted.length - 1;
        return (
          <li key={entry.id} className={cn("relative flex gap-4", !last && (compact ? "pb-4" : "pb-6"))}>
            {!last && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[1.6rem] top-8 -ml-px h-[calc(100%-1.5rem)]",
                  sorted[index + 1].year > currentYear
                    ? "border-l-2 border-dashed border-emerald-500/50"
                    : "w-0.5 bg-gradient-to-b from-emerald-500 to-teal-500",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-8 w-[3.2rem] shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                planned
                  ? "border-2 border-dashed border-emerald-500/60 bg-background text-emerald-700 dark:text-emerald-300"
                  : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm",
                entry.highlight && "ring-2 ring-amber-400 ring-offset-2 ring-offset-background",
              )}
            >
              {entry.year}
            </span>
            <div className={cn("min-w-0 flex-1", compact ? "pt-1" : "pt-0.5")}>
              <p className={cn("font-semibold leading-snug", compact ? "text-sm" : "text-base")}>
                {entry.title || <span className="text-muted-foreground">Untitled milestone</span>}
                {planned && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-px align-middle text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    <Flag className="h-2.5 w-2.5" aria-hidden />
                    Next step
                  </span>
                )}
              </p>
              {entry.subtitle && <p className="text-sm text-muted-foreground">{entry.subtitle}</p>}
              {entry.description && !compact && (
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/80">{entry.description}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
