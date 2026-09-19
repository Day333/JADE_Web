import { BrainCircuit, Mic, Send, Star } from "lucide-react";
import type { GrowthData } from "@/lib/data/growth";
import { cn } from "@/lib/utils";

/** Headline numbers with a "last week" delta, in the style of a coding-profile stats card. */

const TILES = [
  {
    key: "applications" as const,
    label: "Applications",
    icon: Send,
    chip: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  {
    key: "interviews" as const,
    label: "Interviews",
    icon: Mic,
    chip: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  {
    key: "questions" as const,
    label: "Questions practised",
    icon: BrainCircuit,
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "reputation" as const,
    label: "Reputation",
    icon: Star,
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    hint: "Badge points plus likes on your posts",
  },
];

export function StatsPanel({ stats }: { stats: GrowthData["stats"] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {TILES.map(({ key, label, icon: Icon, chip, hint }) => {
        const stat = stats[key];
        return (
          <div key={key} className="rounded-xl border bg-card p-4 sm:p-5" title={hint}>
            <div className="flex items-center gap-2.5">
              <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", chip)}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{stat.total}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Last week{" "}
              <span className={cn("font-semibold tabular-nums", stat.lastWeek > 0 && "text-emerald-600 dark:text-emerald-400")}>
                {stat.lastWeek > 0 ? `+${stat.lastWeek}` : "0"}
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
