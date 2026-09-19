"use client";

import { useMemo, useState, useTransition } from "react";
import { BarChart3, Bot, BrainCircuit, Check, ChevronDown, Code2, HeartHandshake, LineChart, Network, Palette, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setQuestionDone } from "@/lib/actions/practice";
import type { PracticeQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";

export const CATEGORY_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  "ai-agents": { label: "AI Agents & LLMs", icon: Bot },
  "machine-learning": { label: "Machine Learning", icon: BrainCircuit },
  "data-science": { label: "Data Science", icon: BarChart3 },
  "software-engineering": { label: "Software Engineering", icon: Code2 },
  "system-design": { label: "System Design", icon: Network },
  behavioral: { label: "Behavioural", icon: HeartHandshake },
  "product-design": { label: "Product & Design", icon: Palette },
  finance: { label: "Finance", icon: LineChart },
};

const DIFFICULTY_STYLE: Record<string, string> = {
  basic: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  intermediate: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  advanced: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

/** The model answer is plain text with "- " bullets and an optional "Tip:" line. */
function Answer({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, i) =>
        line.trim().startsWith("- ") ? (
          <p key={i} className="flex gap-2 pl-1">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
            <span>{line.trim().slice(2)}</span>
          </p>
        ) : line.trim().startsWith("Tip:") ? (
          <p key={i} className="rounded-lg bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Tip:</span> {line.trim().slice(4)}
          </p>
        ) : (
          <p key={i}>{line}</p>
        ),
      )}
    </div>
  );
}

export function PracticeList({ questions, doneIds }: { questions: PracticeQuestion[]; doneIds: string[] }) {
  const [category, setCategory] = useState<string>("all");
  const [hideDone, setHideDone] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [done, setDone] = useState(() => new Set(doneIds));
  const [, startTransition] = useTransition();

  const categories = useMemo(() => [...new Set(questions.map((q) => q.category))], [questions]);
  const byCategory = (cat: string) => questions.filter((q) => q.category === cat);
  const shown = questions.filter((q) => (category === "all" || q.category === category) && !(hideDone && done.has(q.id)));

  const toggleDone = (question: PracticeQuestion) => {
    const next = !done.has(question.id);
    setDone((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(question.id);
      else copy.delete(question.id);
      return copy;
    });
    startTransition(async () => {
      const result = await setQuestionDone(question.id, next);
      if (!result.ok) {
        toast.error(result.error);
        setDone((prev) => {
          const copy = new Set(prev);
          if (next) copy.delete(question.id);
          else copy.add(question.id);
          return copy;
        });
        return;
      }
      for (const a of result.unlocked) {
        toast.success(`Achievement unlocked: ${a.icon} ${a.name}`, {
          icon: <PartyPopper className="h-4 w-4" aria-hidden />,
          action: { label: "View", onClick: () => (window.location.href = "/progress") },
        });
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Category filter with per-category progress */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0" role="group" aria-label="Filter by category">
        <button
          type="button"
          onClick={() => setCategory("all")}
          aria-pressed={category === "all"}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            category === "all"
              ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950"
              : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          All · {[...done].length}/{questions.length}
        </button>
        {categories.map((cat) => {
          const list = byCategory(cat);
          const doneCount = list.filter((q) => done.has(q.id)).length;
          const Icon = CATEGORY_META[cat]?.icon ?? Bot;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                category === cat
                  ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950"
                  : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {CATEGORY_META[cat]?.label ?? cat} · {doneCount}/{list.length}
            </button>
          );
        })}
        <label className="ml-auto inline-flex shrink-0 cursor-pointer items-center gap-2 self-center text-xs font-medium text-muted-foreground">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="accent-emerald-600" />
          Hide completed
        </label>
      </div>

      {/* Questions */}
      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          Nothing left here — every question in this view is done. 🎉
        </div>
      ) : (
        <ol className="space-y-3">
          {shown.map((q) => {
            const isOpen = openId === q.id;
            const isDone = done.has(q.id);
            return (
              <li key={q.id} className={cn("rounded-xl border bg-card transition-colors", isDone && "border-emerald-500/30")}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : q.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start gap-3 p-4 text-left sm:px-5"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40 text-transparent",
                    )}
                    aria-hidden
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("font-medium leading-snug", isDone && "text-muted-foreground")}>{q.question}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", DIFFICULTY_STYLE[q.difficulty])}>
                        {q.difficulty}
                      </span>
                      {q.tags.slice(0, 3).map((t: string) => (
                        <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </span>
                  </span>
                  <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden />
                </button>
                {isOpen && (
                  <div className="border-t px-4 py-4 sm:px-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Model answer
                    </p>
                    <Answer text={q.answer} />
                    <div className="mt-4">
                      <Button size="sm" variant={isDone ? "outline" : "default"} onClick={() => toggleDone(q)}>
                        <Check className="h-4 w-4" /> {isDone ? "Mark as not done" : "Mark as done"}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
