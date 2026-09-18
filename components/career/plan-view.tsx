import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, Circle, CircleAlert, Compass, Flag, Repeat, ShieldAlert, Target } from "lucide-react";
import { ForYouLabel, MatchBadge, ReadinessRing } from "@/components/app/match";
import type { CareerPlan } from "@/lib/ai/career-plan";
import type { Readiness } from "@/lib/ai/matching";
import { cn } from "@/lib/utils";

function Section({ title, icon: Icon, children, className }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card p-5 sm:p-6", className)}>
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  );
}

export interface PlanJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  match: number;
  why: string;
}

export interface PlanCareer {
  id: string;
  title: string;
  match: number;
  why: string;
}

export function PlanView({
  plan,
  readiness,
  careerTitle,
  jobs,
  careers,
  meta,
}: {
  plan: CareerPlan;
  readiness: Readiness;
  careerTitle: string;
  jobs: PlanJob[];
  careers: PlanCareer[];
  meta: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-2xl border bg-card p-6 sm:p-8">
        <div aria-hidden className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 left-1/3 -z-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex-1 space-y-3">
            <ForYouLabel>AI Career Plan</ForYouLabel>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{plan.headline}</h1>
            <p className="max-w-3xl text-muted-foreground">{plan.summary}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-700 dark:text-emerald-300">
                <CalendarClock className="h-4 w-4" /> {plan.horizon}
              </span>
              <span className="text-xs text-muted-foreground">{meta}</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ReadinessRing value={readiness.overall} size={120} label="Ready today" />
            <span className="text-xs text-muted-foreground">for {careerTitle}</span>
          </div>
        </div>
      </section>

      {/* Where you are */}
      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Your strengths" icon={CheckCircle2}>
          <ul className="space-y-2">
            {plan.whereYouAre.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Your gaps to close" icon={CircleAlert}>
          <ul className="space-y-2">
            {plan.whereYouAre.gaps.map((g) => (
              <li key={g} className="flex gap-2 text-sm">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                {g}
              </li>
            ))}
          </ul>
          <Link href="/skill-gap" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            See your full Skill Gap <ArrowRight className="h-4 w-4" />
          </Link>
        </Section>
      </div>

      {/* Strategy */}
      <Section title="Your strategy" icon={Compass}>
        <ol className="grid gap-4 sm:grid-cols-2">
          {plan.strategy.map((s, i) => (
            <li key={s.title} className="rounded-lg border bg-muted/30 p-4">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">0{i + 1}</span>
              <p className="mt-1 font-medium leading-snug">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Phases */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <Flag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> The plan, phase by phase
        </h2>
        <ol className="grid gap-4 lg:grid-cols-3">
          {plan.phases.map((phase, i) => (
            <li key={phase.name} className="relative flex flex-col rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{phase.timeframe}</span>
              </div>
              <p className="mt-3 text-lg font-semibold">{phase.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{phase.goal}</p>
              <ul className="mt-4 flex-1 space-y-2">
                {phase.actions.map((a) => (
                  <li key={a} className="flex gap-2 text-sm">
                    <Circle className="mt-1 h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    {a}
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-lg bg-emerald-500/5 p-3 text-xs">
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">Deliverable: </span>
                {phase.deliverable}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Start this week" icon={Target}>
          <ul className="space-y-2">
            {plan.thisWeek.map((t) => (
              <li key={t} className="flex gap-2 text-sm">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-emerald-500/50" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
          <Link href="/roadmap" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            Track tasks on your roadmap <ArrowRight className="h-4 w-4" />
          </Link>
        </Section>
        <Section title="Your weekly rhythm" icon={Repeat}>
          <ul className="space-y-2">
            {plan.weeklyRhythm.map((r) => (
              <li key={r} className="flex gap-2 text-sm">
                <Repeat className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Milestones" icon={Flag}>
          <ol className="relative space-y-4 border-l pl-5">
            {plan.milestones.map((m) => (
              <li key={`${m.when}-${m.milestone}`} className="relative">
                <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-emerald-500 bg-background" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">{m.when}</p>
                <p className="text-sm font-medium">{m.milestone}</p>
                <p className="text-xs text-muted-foreground">{m.measure}</p>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      {(jobs.length > 0 || careers.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {jobs.length > 0 && (
            <Section title="Opportunities to aim for" icon={Target}>
              <ul className="space-y-3">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <Link href={`/jobs/${job.id}`} className="block rounded-lg border p-3 transition-colors hover:bg-accent">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium leading-snug">{job.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {job.company}
                            {job.location ? ` · ${job.location}` : ""}
                          </p>
                        </div>
                        <MatchBadge score={job.match} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{job.why}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {careers.length > 0 && (
            <Section title="Alternative paths worth keeping open" icon={Compass}>
              <ul className="space-y-3">
                {careers.map((c) => (
                  <li key={c.id}>
                    <Link href={`/careers/${c.id}`} className="block rounded-lg border p-3 transition-colors hover:bg-accent">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{c.title}</p>
                        <MatchBadge score={c.match} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{c.why}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      <Section title="Risks and how to handle them" icon={ShieldAlert}>
        <ul className="grid gap-4 md:grid-cols-3">
          {plan.risks.map((r) => (
            <li key={r.risk} className="rounded-lg border p-4">
              <p className="text-sm font-medium">{r.risk}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.mitigation}</p>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
