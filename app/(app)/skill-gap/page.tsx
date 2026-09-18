import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleAlert,
  CircleDashed,
  Compass,
  Footprints,
  Lightbulb,
  Map as MapIcon,
  Medal,
  Route,
  Target,
} from "lucide-react";
import { ForYouLabel } from "@/components/app/match";
import { EmptyState, PageHeader } from "@/components/app/page-parts";
import { LevelMeter } from "@/components/career/level-meter";
import { ReadinessCard } from "@/components/career/readiness-card";
import { SkillLevelControl } from "@/components/career/skill-level-control";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { LEVEL_LABELS, computeReadiness, computeSkillGap, type SkillGapItem } from "@/lib/ai/matching";
import { requireProfile } from "@/lib/auth";
import { getCatalog } from "@/lib/data/catalog";
import { loadCareerProfile } from "@/lib/data/profile";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your Skill Gap" };

type StageLink = { id: string; title: string };

const GROUPS = {
  ready: {
    title: "Ready",
    symbol: "✓",
    icon: Check,
    description: "You meet the level this career expects.",
    empty: "No skills at the target level yet. Your roadmap starts here.",
    text: "text-emerald-700 dark:text-emerald-300",
    tone: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/15",
    border: "border-emerald-500/30",
  },
  improving: {
    title: "Improving",
    symbol: "◐",
    icon: CircleDashed,
    description: "You have started. A bit more practice gets you to the target.",
    empty: "Nothing in progress right now.",
    text: "text-sky-700 dark:text-sky-300",
    tone: "text-sky-700 dark:text-sky-300 bg-sky-500/15",
    border: "border-sky-500/30",
  },
  missing: {
    title: "Missing",
    symbol: "△",
    icon: CircleAlert,
    description: "Not on your profile yet. These are your biggest opportunities.",
    empty: "You have every skill this career asks for on your profile.",
    text: "text-amber-700 dark:text-amber-300",
    tone: "text-amber-700 dark:text-amber-300 bg-amber-500/15",
    border: "border-amber-500/40",
  },
} as const;

function SkillDetails({ item, careerTitle, stage }: { item: SkillGapItem; careerTitle: string; stage?: StageLink }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden /> Why {careerTitle} needs it
          </p>
          <p>{item.why}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Medal className="h-3.5 w-3.5" aria-hidden /> Where you have shown it
          </p>
          {item.evidence.length > 0 ? (
            <ul className="space-y-0.5">
              {item.evidence.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Not shown in your profile yet.</p>
          )}
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Target className="h-3.5 w-3.5" aria-hidden /> Your level vs. target
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <LevelMeter level={item.level} target={item.target} />
            <span>
              You: <strong>{LEVEL_LABELS[item.level] ?? "Not yet"}</strong> · Target: <strong>{LEVEL_LABELS[item.target]}</strong>
            </span>
          </div>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <Footprints className="h-3.5 w-3.5" aria-hidden /> Your next step
          </p>
          <p>{item.status === "ready" ? `Keep it sharp: ${item.nextStep}` : item.nextStep}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Update my level</p>
          <SkillLevelControl skillId={item.skillId} skillName={item.name} level={item.level} />
        </div>
        {stage && (
          <Link
            href={`/roadmap#stage-${stage.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            <Route className="h-4 w-4" aria-hidden /> Roadmap: {stage.title} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}

function GapGroup({
  kind,
  items,
  careerTitle,
  stageFor,
}: {
  kind: keyof typeof GROUPS;
  items: SkillGapItem[];
  careerTitle: string;
  stageFor: (skillId: string) => StageLink | undefined;
}) {
  const group = GROUPS[kind];
  const Icon = group.icon;
  return (
    <section id={kind} aria-labelledby={`${kind}-heading`} className={cn("scroll-mt-24 rounded-xl border bg-card", group.border)}>
      <div className="flex items-start gap-3 border-b p-5">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", group.tone)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 id={`${kind}-heading`} className="font-semibold">
            {group.title} <span className="font-normal text-muted-foreground">· {items.length}</span>
          </h2>
          <p className="text-sm text-muted-foreground">{group.description}</p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">{group.empty}</p>
      ) : (
        <Accordion type="multiple" className="px-5">
          {items.map((item) => (
            <AccordionItem key={item.skillId} value={item.skillId} className="last:border-b-0">
              <AccordionTrigger className="gap-3 py-3.5 hover:no-underline [&[data-state=open]_.skill-name]:text-emerald-700 dark:[&[data-state=open]_.skill-name]:text-emerald-400">
                <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden className={cn("w-4 shrink-0 text-center", group.text)}>
                      {group.symbol}
                    </span>
                    <span className="skill-name truncate font-medium">{item.name}</span>
                    {item.importance === 3 && (
                      <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        Core
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-3 pl-6 text-xs font-normal text-muted-foreground sm:pl-0">
                    <span>
                      {item.status === "missing"
                        ? `Target: ${LEVEL_LABELS[item.target]}`
                        : item.status === "improving"
                          ? `${LEVEL_LABELS[item.level]} → ${LEVEL_LABELS[item.target]}`
                          : LEVEL_LABELS[item.level]}
                    </span>
                    <LevelMeter level={item.level} target={item.target} />
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <SkillDetails item={item} careerTitle={careerTitle} stage={stageFor(item.skillId)} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </section>
  );
}

export default async function SkillGapPage() {
  const profile = await requireProfile({ role: "seeker" });
  const [data, catalog] = await Promise.all([loadCareerProfile(profile.id), getCatalog()]);
  const goalId = data?.goal?.career_id;
  const gap = data && goalId ? computeSkillGap(data, catalog, goalId) : null;

  if (!data || !goalId || !gap) {
    return (
      <>
        <PageHeader eyebrow={<ForYouLabel>Your Skill Gap</ForYouLabel>} title="Your Skill Gap" />
        <EmptyState
          icon={Compass}
          title="Choose a career goal first"
          description="Your Skill Gap compares your profile with the career you are aiming for. Explore your recommended careers and set one as your goal: we will analyse the gap automatically."
          action={
            <Button asChild>
              <Link href="/careers">
                Explore careers <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        />
      </>
    );
  }

  const career = gap.career;
  const readiness = computeReadiness(data, catalog, goalId);

  // Link each skill to the roadmap stage that works on it.
  const supabase = await createClient();
  const { data: roadmap } = await supabase
    .from("roadmaps")
    .select("id, career_id, roadmap_stages(id, title, position, skill_id, completed_at, roadmap_tasks(skill_id, is_done))")
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .maybeSingle();
  const stageBySkill = new Map<string, StageLink>();
  let currentStageSkill: string | null = null;
  if (roadmap?.career_id === goalId) {
    const stages = [...roadmap.roadmap_stages].sort((a, b) => a.position - b.position);
    const current = stages.find((stage) =>
      stage.roadmap_tasks.length > 0 ? stage.roadmap_tasks.some((t) => !t.is_done) : !stage.completed_at,
    );
    currentStageSkill = current?.skill_id ?? null;
    for (const stage of stages) {
      const skills = [stage.skill_id, ...stage.roadmap_tasks.map((t) => t.skill_id)].filter((s): s is string => Boolean(s));
      for (const skillId of skills) {
        if (!stageBySkill.has(skillId)) stageBySkill.set(skillId, { id: stage.id, title: stage.title });
      }
    }
  }
  const stageFor = (skillId: string) => stageBySkill.get(skillId);

  // The next step follows the roadmap's current stage when it works on a skill.
  const openItems = [...gap.missing, ...gap.improving];
  const nextFocus = openItems.find((i) => i.skillId === currentStageSkill) ?? openItems[0];
  const counts = [
    { kind: "ready" as const, n: gap.ready.length },
    { kind: "improving" as const, n: gap.improving.length },
    { kind: "missing" as const, n: gap.missing.length },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow={<ForYouLabel>Your Skill Gap</ForYouLabel>}
        title={`Your Skill Gap for ${career.title}`}
        description="How your skills compare with what this career typically needs. Open any skill to see why it matters, where you have shown it and what to do next."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/careers/${career.id}`}>About this career</Link>
            </Button>
            <Button asChild>
              <Link href="/roadmap">
                <MapIcon aria-hidden /> View Roadmap
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <ReadinessCard careerTitle={career.title} readiness={readiness} href="/roadmap" className="lg:col-span-3" />
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="grid grid-cols-3 gap-3">
            {counts.map(({ kind, n }) => {
              const group = GROUPS[kind];
              const Icon = group.icon;
              return (
                <a
                  key={kind}
                  href={`#${kind}`}
                  className={cn("rounded-xl border bg-card p-3 transition-colors hover:bg-accent/50 sm:p-4", group.border)}
                >
                  <span className={cn("mb-2 flex h-7 w-7 items-center justify-center rounded-full", group.tone)}>
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="block text-2xl font-bold tabular-nums">{n}</span>
                  <span className="block text-xs text-muted-foreground">{group.title}</span>
                </a>
              );
            })}
          </div>
          <div className="flex-1 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 p-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <Footprints className="h-3.5 w-3.5" aria-hidden /> Your Next Step
            </p>
            {nextFocus ? (
              <>
                <p className="mt-2 font-semibold">
                  {nextFocus.status === "missing" ? "Learn" : "Strengthen"} {nextFocus.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{nextFocus.nextStep}</p>
                <Link
                  href={stageFor(nextFocus.skillId) ? `/roadmap#stage-${stageFor(nextFocus.skillId)!.id}` : "/roadmap"}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  Start on your roadmap <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </>
            ) : (
              <>
                <p className="mt-2 font-semibold">You meet every skill requirement</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Show it off: add projects and portfolio links, then start applying.
                </p>
                <Link
                  href="/jobs"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  See matching jobs <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <GapGroup kind="ready" items={gap.ready} careerTitle={career.title} stageFor={stageFor} />
      <GapGroup kind="improving" items={gap.improving} careerTitle={career.title} stageFor={stageFor} />
      <GapGroup kind="missing" items={gap.missing} careerTitle={career.title} stageFor={stageFor} />

      <div className="flex flex-col items-start gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <MapIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <div>
            <p className="font-semibold">Turn your gap into a plan</p>
            <p className="text-sm text-muted-foreground">
              Your Career Roadmap breaks these skills into monthly stages with concrete tasks.
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/roadmap">
            View your Career Roadmap <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
