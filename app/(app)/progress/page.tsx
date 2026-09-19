import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, BrainCircuit, CalendarDays } from "lucide-react";
import { ForYouLabel } from "@/components/app/match";
import { PageHeader } from "@/components/app/page-parts";
import { AchievementsWall } from "@/components/growth/achievements";
import { ActivityHeatmap } from "@/components/growth/heatmap";
import { StatsPanel } from "@/components/growth/stats-panel";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { loadGrowth } from "@/lib/data/growth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Progress" };

export default async function ProgressPage() {
  const profile = await requireProfile({ role: "seeker" });
  // Award pass first, so a badge earned elsewhere (e.g. an application) appears on this visit.
  const supabase = await createClient();
  await supabase.rpc("refresh_achievements");
  const growth = await loadGrowth(profile.id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<ForYouLabel>My Progress</ForYouLabel>}
        title="Small steps, every week"
        description="Applications, interviews and practice all count. Keep the streak alive and watch the numbers climb."
        actions={
          <Button asChild>
            <Link href="/practice">
              <BrainCircuit aria-hidden /> Practise questions
            </Link>
          </Button>
        }
      />

      <StatsPanel stats={growth.stats} />

      <section aria-labelledby="activity-heading" className="rounded-xl border bg-card p-5 sm:p-6">
        <h2 id="activity-heading" className="mb-4 flex items-center gap-2 text-base font-semibold">
          <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> Your activity
        </h2>
        <ActivityHeatmap days={growth.days} />
      </section>

      <section aria-labelledby="achievements-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="achievements-heading" className="flex items-center gap-2 text-base font-semibold">
              <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> Achievements
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{growth.earnedCount}</span> of {growth.achievements.length} unlocked ·{" "}
              <span className="font-semibold text-amber-600 dark:text-amber-400">{growth.points} points</span>
            </p>
          </div>
          <Link
            href="/practice"
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Earn the next one <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <AchievementsWall achievements={growth.achievements} />
      </section>
    </div>
  );
}
