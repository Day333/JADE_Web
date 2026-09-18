import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { MatchBadge, SkillChip } from "@/components/app/match";
import { Button } from "@/components/ui/button";
import type { CareerMatch, SkillRequirementView } from "@/lib/ai/matching";
import { skillName } from "@/lib/data/catalog";
import type { Catalog } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "You already have" first the skills that meet the target, then the ones in progress. */
export function haveAndNeed(match: CareerMatch, haveLimit = 5, needLimit = 4) {
  const have = [...match.have]
    .sort((a, b) => Number(b.status === "ready") - Number(a.status === "ready") || b.importance - a.importance || b.level - a.level)
    .slice(0, haveLimit);
  const shown = new Set(have.map((h) => h.skillId));
  const need = match.gaps
    .filter((g) => !shown.has(g.skillId))
    .sort((a, b) => b.importance - a.importance || Number(a.status === "missing") - Number(b.status === "missing"))
    .slice(0, needLimit);
  return { have, need };
}

function Chips({ items, status, catalog }: { items: SkillRequirementView[]; status: "have" | "gap"; catalog: Catalog }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <SkillChip key={item.skillId} name={skillName(catalog, item.skillId)} status={status} />
      ))}
    </div>
  );
}

/** A recommended career with the user's match, what they have and what they may need. */
export function CareerCard({
  match,
  catalog,
  rank,
  isGoal = false,
  featured = false,
  className,
}: {
  match: CareerMatch;
  catalog: Catalog;
  rank?: number;
  isGoal?: boolean;
  featured?: boolean;
  className?: string;
}) {
  const { career } = match;
  const { have, need } = haveAndNeed(match, featured ? 6 : 5, 4);
  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card p-5 transition-shadow hover:shadow-md",
        isGoal && "border-emerald-500/50 ring-1 ring-emerald-500/30",
        featured && "bg-gradient-to-br from-emerald-500/[0.06] via-card to-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {rank !== undefined && (
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {rank === 1 ? "Best match" : `#${rank}`}
              </span>
            )}
            <span>{career.field}</span>
          </div>
          <h3 className={cn("font-semibold leading-snug", featured ? "text-xl" : "text-lg")}>{career.title}</h3>
          {isGoal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-emerald-500 dark:text-emerald-950">
              <Target className="h-3 w-3" aria-hidden /> Your current goal
            </span>
          )}
        </div>
        <MatchBadge score={match.score} className={cn("shrink-0 whitespace-nowrap", featured && "px-3 py-1 text-sm")} />
      </div>

      {featured && <p className="mt-3 text-sm text-muted-foreground">{career.summary}</p>}

      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">You already have</p>
          {have.length > 0 ? (
            <Chips items={have} status="have" catalog={catalog} />
          ) : (
            <p className="text-sm text-muted-foreground">None of the core skills yet — a fresh start.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">You may need</p>
          {need.length > 0 ? (
            <Chips items={need} status="gap" catalog={catalog} />
          ) : (
            <p className="text-sm text-muted-foreground">No major gaps — you are a strong fit.</p>
          )}
        </div>
      </div>

      <div className="mt-5 flex pt-1 sm:mt-auto sm:pt-5">
        <Button asChild variant={featured ? "default" : "outline"} size="sm" className="w-full sm:w-auto">
          <Link href={`/careers/${career.id}`} aria-label={`Explore ${career.title}`}>
            Explore Career <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </article>
  );
}
