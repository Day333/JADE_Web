"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Check, FileText, Loader2, PenLine, RefreshCw, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { generateMyCareerPlan } from "@/lib/actions/career-plan";
import { cn } from "@/lib/utils";

/** Build steps with the elapsed seconds at which each one starts. */
const STEPS = [
  { icon: FileText, label: "Reading your Career Profile", at: 0 },
  { icon: Target, label: "Analysing your skill gap", at: 3 },
  { icon: BriefcaseBusiness, label: "Checking your roadmap and matching jobs", at: 8 },
  { icon: PenLine, label: "Writing your personalised plan", at: 14 },
];

function useGeneratePlan() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!pending) return;
    setElapsed(0);
    const started = Date.now();
    const timer = setInterval(() => setElapsed((Date.now() - started) / 1000), 400);
    return () => clearInterval(timer);
  }, [pending]);

  const run = () =>
    startTransition(async () => {
      const result = await generateMyCareerPlan();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Your AI Career Plan is ready");
      router.refresh();
    });

  const stepIndex = STEPS.reduce((current, step, i) => (elapsed >= step.at ? i : current), 0);
  // Eases towards ~96% while the model writes; the finished page takes it from there.
  const progress = Math.min(96, Math.round(100 * (1 - Math.exp(-elapsed / 40))));
  return { pending, stepIndex, progress, run };
}

/** The animated "we are building your plan" state: progress bar plus live steps. */
function BuildingSteps({ stepIndex, progress, className }: { stepIndex: number; progress: number; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-md", className)}>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-[width] duration-500"
          style={{ width: `${Math.max(progress, 4)}%` }}
        />
      </div>
      <ol className="mt-5 space-y-3 text-left" aria-live="polite">
        {STEPS.map(({ icon: Icon, label }, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "active" : "todo";
          return (
            <li key={label} className={cn("flex items-center gap-3 text-sm transition-opacity duration-500", state === "todo" && "opacity-40")}>
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                  state === "done" && "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  state === "active" && "border-emerald-500 text-emerald-600 dark:text-emerald-400",
                  state === "todo" && "text-muted-foreground",
                )}
              >
                {state === "done" ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : state === "active" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                )}
              </span>
              <span className={cn(state === "active" && "font-medium")}>
                {label}
                {state === "active" && "…"}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 text-center text-xs text-muted-foreground">
        The AI writes your plan from scratch, so this usually takes about a minute. Please keep this page open.
      </p>
    </div>
  );
}

export function RegeneratePlanButton({ variant = "outline", size }: { variant?: ButtonProps["variant"]; size?: ButtonProps["size"] }) {
  const { pending, stepIndex, progress, run } = useGeneratePlan();
  return (
    <>
      <Button variant={variant} size={size} onClick={run} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {pending ? "Rebuilding your plan…" : "Regenerate plan"}
      </Button>
      {/* While regenerating, the whole page waits behind the building screen. */}
      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Building your AI Career Plan"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
        >
          <div className="relative isolate w-full max-w-lg overflow-hidden rounded-2xl border bg-card p-6 text-center shadow-2xl sm:p-8 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95">
            <div aria-hidden className="absolute -left-16 -top-16 -z-10 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl motion-safe:animate-float" />
            <div aria-hidden className="absolute -bottom-20 -right-10 -z-10 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl motion-safe:animate-float [animation-delay:-5s]" />
            <span className="inline-flex rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 p-3 text-white shadow-lg shadow-emerald-500/20">
              <Sparkles className="h-7 w-7 motion-safe:animate-pulse" aria-hidden />
            </span>
            <h2 className="mt-4 text-xl font-semibold">Building your new AI Career Plan</h2>
            <BuildingSteps stepIndex={stepIndex} progress={progress} className="mt-6" />
          </div>
        </div>
      )}
    </>
  );
}

/** Shown when there is no plan yet for the current goal. Starts generating on its own. */
export function GeneratePlanPanel({ careerTitle, autoStart = true }: { careerTitle: string; autoStart?: boolean }) {
  const { pending, stepIndex, progress, run } = useGeneratePlan();
  const started = useRef(false);

  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true;
      run();
    }
    // run is stable enough for a one-off start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return (
    <div className="relative isolate overflow-hidden rounded-2xl border bg-card px-6 py-16 text-center">
      <div aria-hidden className="absolute -left-16 -top-16 -z-10 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl motion-safe:animate-float" />
      <div aria-hidden className="absolute -bottom-20 -right-10 -z-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl motion-safe:animate-float [animation-delay:-5s]" />
      <div className="mx-auto inline-flex rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 p-3 text-white shadow-lg shadow-emerald-500/20">
        <Sparkles className={cn("h-7 w-7", pending && "motion-safe:animate-pulse")} aria-hidden />
      </div>
      <h2 className="mt-5 text-xl font-semibold">
        {pending ? "Building your AI Career Plan" : `Your AI Career Plan for ${careerTitle}`}
      </h2>
      {pending ? (
        <BuildingSteps stepIndex={stepIndex} progress={progress} className="mt-6" />
      ) : (
        <>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            A personalised strategy that turns your skill gap and roadmap into phases, milestones and next steps.
          </p>
          <Button className="mt-6" size="lg" onClick={run}>
            <Sparkles className="h-4 w-4" /> Generate my plan
          </Button>
        </>
      )}
    </div>
  );
}
