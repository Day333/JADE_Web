import Link from "next/link";
import { ArrowRight, Route } from "lucide-react";
import { ForYouLabel } from "@/components/app/match";
import { PageHeader } from "@/components/app/page-parts";
import { UserAvatar } from "@/components/app/user-avatar";
import { loadJourney, loadPeopleLikeMe } from "@/components/community/data";
import { JourneyEditor, type JourneySuggestion } from "@/components/community/journey-editor";
import { JourneyTimeline } from "@/components/community/journey-timeline";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { getCatalog } from "@/lib/data/catalog";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Career Journey" };

/** First four-digit year in a free-text date like "Feb 2025" or "2020". */
function parseYear(value: string | null | undefined) {
  const match = value?.match(/\b(19[5-9]\d|20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

export default async function JourneyPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  const [entries, educations, experiences, goal, catalog] = await Promise.all([
    loadJourney(profile.id),
    supabase.from("educations").select("*").eq("user_id", profile.id).order("position"),
    supabase.from("experiences").select("*").eq("user_id", profile.id).order("position"),
    supabase.from("career_goals").select("career_id").eq("user_id", profile.id).maybeSingle(),
    getCatalog(),
  ]);
  const people = await loadPeopleLikeMe(profile, goal.data?.career_id ?? null, 3);

  const suggestions: JourneySuggestion[] = [];
  for (const edu of educations.data ?? []) {
    const year = parseYear(edu.start_date) ?? parseYear(edu.end_date);
    if (!year) continue;
    suggestions.push({
      key: `edu-${edu.id}`,
      year,
      title: edu.degree || (edu.field ? `Studied ${edu.field}` : `Started at ${edu.school}`),
      subtitle: edu.school,
      description: null,
      source: "Education",
    });
  }
  for (const exp of experiences.data ?? []) {
    const year = parseYear(exp.start_date) ?? parseYear(exp.end_date);
    if (!year) continue;
    suggestions.push({
      key: `exp-${exp.id}`,
      year,
      title: exp.title,
      subtitle: exp.organization,
      description: null,
      source: "Experience",
    });
  }
  const career = goal.data ? catalog.careerById.get(goal.data.career_id) : null;
  if (career) {
    const target = Math.max(profile.graduation_year ?? currentYear + 1, currentYear + 1);
    suggestions.push({
      key: `goal-${career.id}`,
      year: target,
      title: career.title,
      subtitle: "My career goal",
      description: null,
      source: "Career goal",
    });
  }
  suggestions.sort((a, b) => a.year - b.year);

  return (
    <div>
      <PageHeader
        eyebrow={<ForYouLabel>Career Journey</ForYouLabel>}
        title="Your Career Journey"
        description="A simple timeline of how you got here and where you're heading. It helps people one step behind you answer: “How did they get there?”"
        actions={
          <Button variant="outline" asChild>
            <Link href={`/u/${profile.id}#journey`}>
              View on my profile <ArrowRight />
            </Link>
          </Button>
        }
      />

      <JourneyEditor userId={profile.id} initialEntries={entries} suggestions={suggestions} currentYear={currentYear} />

      <section className="mt-10">
        <ForYouLabel>People like you</ForYouLabel>
        <h2 className="mt-1 text-xl font-semibold">How did they get there?</h2>
        <p className="text-sm text-muted-foreground">Career Journeys shared by members with a similar goal, university or study area.</p>
        {people.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
            <Route className="mx-auto mb-2 h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
            No one else has shared a journey yet — yours could be the first one a student sees.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {people.map((p) => (
              <article key={p.id} className="rounded-xl border bg-card p-5">
                <Link href={`/u/${p.id}`} className="flex items-center gap-3">
                  <UserAvatar name={p.full_name} seed={p.id} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium hover:underline">{p.full_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.headline ?? p.university}</span>
                  </span>
                </Link>
                <JourneyTimeline className="mt-4" entries={p.entries.slice(-4)} currentYear={currentYear} compact />
                <Button variant="ghost" size="sm" className="-mx-2 mt-3" asChild>
                  <Link href={`/u/${p.id}#journey`}>
                    View Career Journey <ArrowRight />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
