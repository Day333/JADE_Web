import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Compass, LayoutDashboard, Lightbulb, PartyPopper, SlidersHorizontal, Trophy } from "lucide-react";
import { ForYouLabel, MatchBadge, SkillChip } from "@/components/app/match";
import { StarRating } from "@/components/app/page-parts";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { findHiddenPotential, recommendCareers } from "@/lib/ai/index";
import { preferenceDisplayRows, type PreferenceScores } from "@/lib/ai/questionnaire";
import { getCatalog, skillName } from "@/lib/data/catalog";
import { loadCareerProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Your Career Profile is ready" };

export default async function OnboardingCompletePage() {
  const profile = await requireProfile({ role: "seeker" });
  const [data, catalog] = await Promise.all([loadCareerProfile(profile.id), getCatalog()]);
  if (!data) return null;

  const ranked = await recommendCareers(data, catalog);
  const hidden = await findHiddenPotential(data, catalog, ranked);
  const directions = ranked.filter((m) => m.score >= 50).length;
  const top = ranked.slice(0, 3);
  const potential = hidden[0];
  const scores = (data.preferences?.scores ?? {}) as PreferenceScores;
  const hasScores = Object.keys(scores).length > 0;
  const skillCount = data.skills.length;
  const topSkills = [...data.skills].sort((a, b) => b.level - a.level).slice(0, 8);
  const firstName = profile.full_name?.split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-cyan-500/15 px-6 py-12 text-center sm:px-12 sm:py-16">
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 animate-float rounded-full bg-emerald-400/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 animate-float rounded-full bg-cyan-400/20 blur-3xl [animation-delay:-7s]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
          {[
            "left-[12%] top-[22%] bg-emerald-400",
            "left-[22%] top-[70%] bg-amber-400",
            "left-[80%] top-[18%] bg-cyan-400",
            "left-[88%] top-[64%] bg-emerald-500",
            "left-[48%] top-[10%] bg-teal-400",
            "left-[64%] top-[82%] bg-amber-300",
          ].map((cls) => (
            <span key={cls} className={`absolute h-2 w-2 rotate-45 rounded-[2px] opacity-70 ${cls}`} />
          ))}
        </div>
        <div className="relative space-y-4">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
            <PartyPopper className="h-8 w-8" aria-hidden />
          </span>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {firstName ? `Nice work, ${firstName}` : "Nice work"}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Your Career Profile is ready</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
            We found{" "}
            <strong className="font-semibold text-foreground">
              {skillCount} skill{skillCount === 1 ? "" : "s"}
            </strong>{" "}
            and{" "}
            <strong className="font-semibold text-foreground">
              {directions} potential career direction{directions === 1 ? "" : "s"}
            </strong>{" "}
            for you.
          </p>
          {topSkills.length > 0 && (
            <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-1.5 pt-2">
              {topSkills.map((s) => (
                <SkillChip key={s.skill_id} name={skillName(catalog, s.skill_id)} status="have" />
              ))}
              {skillCount > topSkills.length && (
                <span className="self-center text-xs text-muted-foreground">+{skillCount - topSkills.length} more</span>
              )}
            </div>
          )}
          <div className="flex flex-col justify-center gap-3 pt-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/careers">
                <Compass aria-hidden /> Explore my career matches
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="bg-background/60">
              <Link href="/dashboard">
                <LayoutDashboard aria-hidden /> Go to my dashboard
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Top matches */}
        <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6 lg:col-span-3">
          <ForYouLabel>Your top career matches</ForYouLabel>
          <h2 className="mt-1 text-lg font-semibold">Careers that fit you best right now</h2>
          <ol className="mt-4 space-y-3">
            {top.map((m, i) => (
              <li key={m.career.id}>
                <Link
                  href={`/careers/${m.career.id}`}
                  className="group flex items-start gap-3 rounded-lg border p-4 transition-colors hover:border-emerald-500/50 hover:bg-accent/40"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {i === 0 ? <Trophy className="h-4 w-4" aria-hidden /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold group-hover:underline">{m.career.title}</p>
                      <MatchBadge score={m.score} />
                    </div>
                    <p className="text-xs text-muted-foreground">{m.career.field}</p>
                    {m.have.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.have.slice(0, 4).map((h) => (
                          <SkillChip key={h.skillId} name={skillName(catalog, h.skillId)} status={h.status === "ready" ? "ready" : "improving"} />
                        ))}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* Preference profile */}
        <section className="flex flex-col rounded-xl border bg-card p-5 shadow-sm sm:p-6 lg:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            Your Career Preference Profile
          </div>
          {hasScores ? (
            <ul className="mb-5 mt-4 space-y-2.5">
              {preferenceDisplayRows(scores).map((row) => (
                <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <StarRating value={row.value} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              You skipped the questionnaire.{" "}
              <Link href="/onboarding/preferences?retake=1" className="font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400">
                Take it now
              </Link>{" "}
              to improve your matches.
            </p>
          )}
          <p className="mt-auto border-t pt-4 text-xs text-muted-foreground">
            {hasScores ? "Based on your questionnaire answers. " : ""}Your matches weigh these preferences alongside
            your skills. You can retake the questionnaire any time from your{" "}
            <Link href="/profile#preferences" className="underline-offset-4 hover:underline">
              Career Profile
            </Link>
            .
          </p>
        </section>
      </div>

      {/* Hidden potential */}
      {potential ? (
        <section className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Lightbulb className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Hidden Career Potential
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{potential.match.career.title}</h2>
                  <MatchBadge score={potential.match.score} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">A career you might not have considered yet.</p>
              </div>
              <div>
                <p className="text-sm font-medium">Why?</p>
                <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                  {potential.reasons.map((reason) => (
                    <li key={reason} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">{potential.explanation}</p>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/careers/${potential.match.career.id}`}>
                  Explore {potential.match.career.title} <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground sm:p-6">
          <p className="font-medium text-foreground">Uncover your hidden career potential</p>
          <p className="mt-1">
            Add more projects, experience and skills to your{" "}
            <Link href="/profile" className="font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400">
              Career Profile
            </Link>{" "}
            and we&apos;ll point out careers outside your main field that suit your strengths.
          </p>
        </section>
      )}
    </div>
  );
}
