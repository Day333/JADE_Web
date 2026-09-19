import { Lock } from "lucide-react";
import type { GrowthData } from "@/lib/data/growth";
import { cn } from "@/lib/utils";

/**
 * Badge wall: earned badges are colourful medallions with their tier ring;
 * locked ones are dimmed and show how to earn them, so there is always a
 * visible next step.
 */

const TIER_RING: Record<string, string> = {
  bronze: "from-orange-300 to-amber-500 shadow-amber-500/25",
  silver: "from-slate-200 to-slate-400 shadow-slate-400/25",
  gold: "from-yellow-300 to-amber-400 shadow-yellow-500/30",
};

const TIER_LABEL: Record<string, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };

export function AchievementsWall({ achievements }: { achievements: GrowthData["achievements"] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {achievements.map((a) => {
        const earned = Boolean(a.earnedAt);
        return (
          <div
            key={a.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors",
              earned ? "border-amber-500/30" : "opacity-70",
            )}
          >
            <span
              className={cn(
                "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl",
                earned ? cn("bg-gradient-to-br shadow-lg", TIER_RING[a.tier]) : "bg-muted grayscale",
              )}
              aria-hidden
            >
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", earned ? "bg-card/90" : "")}>
                {earned ? a.icon : <Lock className="h-4 w-4 text-muted-foreground" />}
              </span>
            </span>
            <div className="min-w-0">
              <p className={cn("font-semibold leading-snug", !earned && "text-muted-foreground")}>{a.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {TIER_LABEL[a.tier]} · {a.points} pts
                {earned && a.earnedAt && (
                  <span className="ml-1 normal-case tracking-normal text-emerald-600 dark:text-emerald-400">
                    · earned {new Date(a.earnedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </span>
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
