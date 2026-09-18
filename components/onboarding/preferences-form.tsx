"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  COMPANY_TYPE_OPTIONS,
  INDUSTRY_OPTIONS,
  LOCATION_OPTIONS,
  PREFERENCE_QUESTIONS,
  WORK_TYPE_OPTIONS,
} from "@/lib/ai/questionnaire";
import { savePreferences, type PreferencesInput } from "@/lib/actions/onboarding";
import { ChipMultiSelect } from "@/components/profile/chip-multi-select";
import type { CareerOption } from "@/components/profile/model";
import { cn } from "@/lib/utils";

const SCALE = [
  { value: 1, label: "Strongly" },
  { value: 2, label: "Somewhat" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Somewhat" },
  { value: 5, label: "Strongly" },
];

export function PreferencesForm({
  initial,
  careers,
  mode,
}: {
  initial: PreferencesInput;
  careers: CareerOption[];
  mode: "onboarding" | "retake";
}) {
  const total = PREFERENCE_QUESTIONS.length;
  const [answers, setAnswers] = useState<Record<string, number>>(initial.answers);
  const firstUnanswered = PREFERENCE_QUESTIONS.findIndex((q) => !initial.answers[q.id]);
  const [index, setIndex] = useState(mode === "retake" || firstUnanswered === -1 ? 0 : firstUnanswered);
  const [industries, setIndustries] = useState(initial.interestedIndustries);
  const [workTypes, setWorkTypes] = useState(initial.workTypes);
  const [companyTypes, setCompanyTypes] = useState(initial.companyTypes);
  const [locations, setLocations] = useState(initial.preferredLocations);
  const [interested, setInterested] = useState(initial.interestedCareers);
  const [pending, startTransition] = useTransition();

  const onInterests = index >= total;
  const answered = PREFERENCE_QUESTIONS.filter((q) => answers[q.id]).length;
  const progress = Math.round(((onInterests ? total + 0.5 : answered) / (total + 1)) * 100);
  const question = PREFERENCE_QUESTIONS[Math.min(index, total - 1)];

  const careerGroups = useMemo(() => {
    const groups = new Map<string, CareerOption[]>();
    for (const c of careers) groups.set(c.field, [...(groups.get(c.field) ?? []), c]);
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [careers]);

  const answer = (value: number) => {
    const at = index;
    setAnswers((a) => ({ ...a, [question.id]: value }));
    // Move on to the next question (unless the user already navigated away).
    window.setTimeout(() => setIndex((i) => (i === at ? Math.min(at + 1, total) : i)), 220);
  };

  const submit = () =>
    startTransition(async () => {
      const result = await savePreferences(
        {
          answers,
          interestedIndustries: industries,
          workTypes,
          companyTypes,
          preferredLocations: locations,
          interestedCareers: interested,
        },
        mode === "retake",
      );
      if (result?.error) toast.error(result.error);
    });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {onInterests ? "Almost done — your interests" : `Question ${index + 1} of ${total}`}
          </span>
          <span className="tabular-nums text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} aria-label="Questionnaire progress" className="h-2" />
      </div>

      {!onInterests ? (
        <div key={question.id} className="rounded-2xl border bg-card p-5 shadow-sm animate-in fade-in-0 slide-in-from-right-4 sm:p-8">
          <h2 className="text-center text-xl font-semibold sm:text-2xl">{question.prompt}</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">Pick the point that feels most like you.</p>

          <div className="mt-8 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr] sm:gap-6">
            <div
              className={cn(
                "rounded-xl border p-4 text-center text-sm font-medium transition-colors sm:text-right",
                (answers[question.id] ?? 3) < 3 && "border-emerald-500/60 bg-emerald-500/5",
              )}
            >
              {question.left}
            </div>
            <div role="radiogroup" aria-label={question.prompt} className="flex items-end justify-center gap-2 sm:gap-3">
              {SCALE.map((point) => {
                const selected = answers[question.id] === point.value;
                const size = point.value === 3 ? "h-8 w-8" : point.value === 2 || point.value === 4 ? "h-10 w-10" : "h-12 w-12";
                const side = point.value < 3 ? question.left : point.value > 3 ? question.right : "Neither";
                return (
                  <button
                    key={point.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={point.value === 3 ? "Neutral" : `${point.label}: ${side}`}
                    data-score={point.value}
                    onClick={() => answer(point.value)}
                    className={cn(
                      "flex shrink-0 items-center justify-center rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      size,
                      selected
                        ? "scale-110 border-emerald-500 bg-emerald-500 text-white shadow-md"
                        : "border-muted-foreground/30 hover:scale-105 hover:border-emerald-500",
                    )}
                  >
                    {selected && <Check className="h-4 w-4" aria-hidden />}
                  </button>
                );
              })}
            </div>
            <div
              className={cn(
                "rounded-xl border p-4 text-center text-sm font-medium transition-colors sm:text-left",
                (answers[question.id] ?? 3) > 3 && "border-emerald-500/60 bg-emerald-500/5",
              )}
            >
              {question.right}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
              <ArrowLeft aria-hidden /> Back
            </Button>
            <div className="hidden gap-1 sm:flex" aria-hidden>
              {PREFERENCE_QUESTIONS.map((q, i) => (
                <span
                  key={q.id}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    i === index ? "bg-emerald-500" : answers[q.id] ? "bg-emerald-500/40" : "bg-muted",
                  )}
                />
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIndex((i) => Math.min(total, i + 1))}>
              {answers[question.id] ? "Next" : "Skip"} <ArrowRight aria-hidden />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 animate-in fade-in-0">
          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="font-semibold">Which industries interest you?</h2>
            <p className="mb-3 text-sm text-muted-foreground">Choose as many as you like.</p>
            <ChipMultiSelect
              label="Industries"
              options={INDUSTRY_OPTIONS.map((o) => ({ value: o, label: o }))}
              value={industries}
              onChange={setIndustries}
            />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="font-semibold">What kind of work are you looking for?</h2>
              <p className="mb-3 text-sm text-muted-foreground">We&apos;ll prioritise these in your job matches.</p>
              <ChipMultiSelect label="Work types" options={WORK_TYPE_OPTIONS} value={workTypes} onChange={setWorkTypes} />
            </div>
            <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="font-semibold">Where would you like to work?</h2>
              <p className="mb-3 text-sm text-muted-foreground">Preferred locations.</p>
              <ChipMultiSelect
                label="Preferred locations"
                options={LOCATION_OPTIONS.map((o) => ({ value: o, label: o }))}
                value={locations}
                onChange={setLocations}
              />
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="font-semibold">What type of company appeals to you?</h2>
            <p className="mb-3 text-sm text-muted-foreground">Culture and size matter as much as the role.</p>
            <ChipMultiSelect
              label="Company types"
              options={COMPANY_TYPE_OPTIONS.map((o) => ({ value: o, label: o }))}
              value={companyTypes}
              onChange={setCompanyTypes}
            />
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="font-semibold">
              Careers you&apos;re curious about <span className="font-normal text-muted-foreground">(optional)</span>
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Not sure yet? Skip this — we&apos;ll recommend careers based on your skills and answers.
            </p>
            <div className="space-y-4">
              {careerGroups.map(([field, list]) => (
                <div key={field}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{field}</p>
                  <ChipMultiSelect
                    label={`${field} careers`}
                    options={list.map((c) => ({ value: c.id, label: c.title }))}
                    value={interested}
                    onChange={setInterested}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={() => setIndex(total - 1)}>
              <ArrowLeft aria-hidden /> Back to questions
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {mode === "retake" && (
                <Button variant="outline" asChild>
                  <Link href="/profile">Cancel</Link>
                </Button>
              )}
              <Button size="lg" onClick={submit} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
                {pending
                  ? "Saving…"
                  : mode === "retake"
                    ? "Save my preferences"
                    : "Build my Career Profile"}
              </Button>
            </div>
          </div>
          {answered < total && (
            <p className="text-right text-xs text-muted-foreground">
              You answered {answered} of {total} questions — answering all of them gives better matches.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
