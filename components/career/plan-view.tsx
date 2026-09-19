import { APP_NAME } from "@/lib/config";
import { Fragment } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, CircleAlert, Compass, FileDown, Flag, Target } from "lucide-react";
import { ForYouLabel, ReadinessRing } from "@/components/app/match";
import { DownloadPlanButton } from "@/components/career/plan-download";
import type { CareerPlan } from "@/lib/ai/career-plan";
import type { Readiness } from "@/lib/ai/matching";
import { cn } from "@/lib/utils";

/**
 * Plan text with a few **highlighted** phrases (marked by the model or the
 * rules writer with double asterisks), rendered as marker-pen emphasis.
 */
function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong
            key={i}
            className="rounded-sm bg-emerald-500/15 px-1 py-0.5 font-semibold text-emerald-900 box-decoration-clone dark:bg-emerald-400/15 dark:text-emerald-200"
          >
            {part}
          </strong>
        ) : (
          // Strip any stray, unpaired markers instead of showing them.
          <Fragment key={i}>{part.replaceAll("**", "")}</Fragment>
        ),
      )}
    </>
  );
}

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

/**
 * The on-page summary of the AI Career Plan. The complete version — per-phase
 * action checklists, weekly rhythm, milestones, matched opportunities,
 * alternative paths and risks — is the downloadable PDF (a Pro feature).
 */
export function PlanView({
  plan,
  readiness,
  careerTitle,
  isPro,
  meta,
}: {
  plan: CareerPlan;
  readiness: Readiness;
  careerTitle: string;
  isPro: boolean;
  meta: React.ReactNode;
}) {
  const actionCount = plan.phases.reduce((n, p) => n + p.actions.length, 0);
  const inPdf = [
    `Action checklists for every phase (${actionCount} concrete actions)`,
    `Your weekly rhythm and ${plan.milestones.length} measurable milestones`,
    plan.targetOpportunities.length > 0 ? `${plan.targetOpportunities.length} matched job opportunities to aim for` : null,
    plan.alternativePaths.length > 0 ? `${plan.alternativePaths.length} alternative career paths worth keeping open` : null,
    `${plan.risks.length} risks and how to handle them`,
  ].filter((x): x is string => x !== null);

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
            <p className="max-w-3xl text-muted-foreground">
              <Rich text={plan.summary} />
            </p>
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
            {plan.whereYouAre.strengths.slice(0, 3).map((s) => (
              <li key={s} className="flex gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <span>
                  <Rich text={s} />
                </span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Your gaps to close" icon={CircleAlert}>
          <ul className="space-y-2">
            {plan.whereYouAre.gaps.slice(0, 3).map((g) => (
              <li key={g} className="flex gap-2 text-sm">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                <span>
                  <Rich text={g} />
                </span>
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
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plan.strategy.slice(0, 3).map((s, i) => (
            <li key={s.title} className="rounded-lg border bg-muted/30 p-4">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">0{i + 1}</span>
              <p className="mt-1 font-medium leading-snug">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <Rich text={s.detail} />
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Phases at a glance; the step-by-step actions live in the PDF and on the roadmap. */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <Flag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> The plan at a glance
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
              <p className="mt-1 flex-1 text-sm text-muted-foreground">
                <Rich text={phase.goal} />
              </p>
              {phase.deliverable && (
                <p className="mt-4 rounded-lg bg-emerald-500/5 p-3 text-xs">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">Deliverable: </span>
                  <Rich text={phase.deliverable} />
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Start this week" icon={Target}>
          <ul className="space-y-2">
            {plan.thisWeek.slice(0, 3).map((t) => (
              <li key={t} className="flex gap-2 text-sm">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-emerald-500/50" aria-hidden />
                <span>
                  <Rich text={t} />
                </span>
              </li>
            ))}
          </ul>
          <Link href="/roadmap" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            Track tasks on your roadmap <ArrowRight className="h-4 w-4" />
          </Link>
        </Section>

        {/* The complete plan as a PDF (Pro) */}
        <Section
          title="The complete plan as a PDF"
          icon={FileDown}
          className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.06] via-card to-card"
        >
          <p className="text-sm text-muted-foreground">This page is the summary. The PDF is the full written plan, ready to keep or print:</p>
          <ul className="mt-3 space-y-2">
            {inPdf.map((item) => (
              <li key={item} className="flex gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <DownloadPlanButton isPro={isPro} careerTitle={careerTitle} variant="default" />
          </div>
          {!isPro && (
            <p className="mt-2 text-xs text-muted-foreground">Downloading is a {APP_NAME} Pro feature — free during the beta.</p>
          )}
        </Section>
      </div>
    </div>
  );
}
