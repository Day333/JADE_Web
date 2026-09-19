"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BrainCircuit, Check, MessagesSquare, Send, Sparkles, Target, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * First-steps checklist for new seekers. Every step's done state is derived
 * from real data on the server, so it stays accurate and disappears by itself
 * once the user has done the five things that make the platform click.
 */

export interface GettingStartedStep {
  key: string;
  done: boolean;
}

const STEP_META: Record<string, { label: string; href: string; icon: React.ComponentType<{ className?: string }> }> = {
  goal: { label: "Set your career goal", href: "/careers", icon: Target },
  plan: { label: "Generate your AI Career Plan", href: "/plan", icon: Sparkles },
  practice: { label: "Practise an interview question", href: "/practice", icon: BrainCircuit },
  apply: { label: "Apply for your first job", href: "/jobs", icon: Send },
  community: { label: "Share a post or your journey", href: "/community/new", icon: MessagesSquare },
};

const DISMISS_KEY = "getting-started-dismissed";

export function GettingStarted({ steps }: { steps: GettingStartedStep[] }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {}
  }, []);

  const doneCount = steps.filter((s) => s.done).length;
  if (dismissed || doneCount === steps.length) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  return (
    <section
      aria-labelledby="getting-started-heading"
      className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 p-5 sm:p-6"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss the getting-started guide"
        className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-wrap items-end justify-between gap-2 pr-8">
        <div>
          <h2 id="getting-started-heading" className="text-lg font-semibold tracking-tight">
            Welcome aboard — five steps to your first win
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Each one takes a few minutes, and your dashboard gets smarter after every step.
          </p>
        </div>
        <p className="text-sm font-medium tabular-nums text-emerald-700 dark:text-emerald-400">{doneCount} of {steps.length} done</p>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-500/15" aria-hidden>
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
          style={{ width: `${Math.max(6, (doneCount / steps.length) * 100)}%` }}
        />
      </div>

      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, i) => {
          const meta = STEP_META[step.key];
          if (!meta) return null;
          const Icon = meta.icon;
          const next = !step.done && steps.slice(0, i).every((s) => s.done);
          return (
            <li key={step.key}>
              <Link
                href={meta.href}
                aria-label={`${meta.label}${step.done ? " (done)" : ""}`}
                className={cn(
                  "group flex h-full items-start gap-2.5 rounded-lg border bg-card/70 p-3 transition-colors hover:bg-card",
                  step.done && "opacity-70",
                  next && "border-emerald-500/50 ring-1 ring-emerald-500/30",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                    step.done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-muted-foreground/40 text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {step.done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("flex items-center gap-1.5 text-sm font-medium leading-snug", step.done && "line-through decoration-muted-foreground/50")}>
                    <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    {meta.label}
                  </span>
                  {next && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Start here <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
