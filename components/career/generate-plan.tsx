"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { generateMyCareerPlan } from "@/lib/actions/career-plan";

const STEPS = [
  "Reading your Career Profile…",
  "Analysing your skill gap…",
  "Checking your roadmap and matching jobs…",
  "Writing your plan… this usually takes about a minute",
];

function useGeneratePlan() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!pending) return;
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1400);
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

  return { pending, step: STEPS[step], run };
}

export function RegeneratePlanButton({ variant = "outline", size }: { variant?: ButtonProps["variant"]; size?: ButtonProps["size"] }) {
  const { pending, step, run } = useGeneratePlan();
  return (
    <Button variant={variant} size={size} onClick={run} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      {pending ? step : "Regenerate plan"}
    </Button>
  );
}

/** Shown when there is no plan yet for the current goal. Starts generating on its own. */
export function GeneratePlanPanel({ careerTitle, autoStart = true }: { careerTitle: string; autoStart?: boolean }) {
  const { pending, step, run } = useGeneratePlan();
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
        {pending ? <Loader2 className="h-7 w-7 animate-spin" /> : <Sparkles className="h-7 w-7" />}
      </div>
      <h2 className="mt-5 text-xl font-semibold">
        {pending ? "Building your AI Career Plan" : `Your AI Career Plan for ${careerTitle}`}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground" aria-live="polite">
        {pending
          ? step
          : "A personalised strategy that turns your skill gap and roadmap into phases, milestones and next steps."}
      </p>
      {!pending && (
        <Button className="mt-6" size="lg" onClick={run}>
          <Sparkles className="h-4 w-4" /> Generate my plan
        </Button>
      )}
    </div>
  );
}
