"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Eye, Loader2, Pencil, Plus, Route, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { JourneyTimeline, sortJourney, type TimelineEntry } from "@/components/community/journey-timeline";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addJourneyEntries, deleteJourneyEntry, saveJourneyEntry, type JourneyInput } from "@/lib/actions/community";
import { cn } from "@/lib/utils";
import type { JourneyEntry } from "@/lib/types";

export interface JourneySuggestion extends JourneyInput {
  key: string;
  source: string;
}

interface Draft {
  year: string;
  title: string;
  subtitle: string;
  description: string;
}

const emptyDraft = (year: number): Draft => ({ year: String(year), title: "", subtitle: "", description: "" });

function EntryForm({
  draft,
  onChange,
  onCancel,
  onSubmit,
  pending,
  submitLabel,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onCancel: () => void;
  onSubmit: () => void;
  pending: boolean;
  submitLabel: string;
}) {
  return (
    <form
      className="space-y-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[100px_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <Label htmlFor="journey-year">Year</Label>
          <Input
            id="journey-year"
            type="number"
            inputMode="numeric"
            min={1950}
            max={2100}
            required
            value={draft.year}
            onChange={(e) => onChange({ ...draft, year: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="journey-title">Milestone</Label>
          <Input
            id="journey-title"
            required
            maxLength={120}
            autoFocus
            placeholder="e.g. Data Analyst Intern"
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="journey-subtitle">Where</Label>
        <Input
          id="journey-subtitle"
          maxLength={120}
          placeholder="University, company or program (optional)"
          value={draft.subtitle}
          onChange={(e) => onChange({ ...draft, subtitle: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="journey-description">What happened &amp; what helped</Label>
        <Textarea
          id="journey-description"
          maxLength={1000}
          rows={3}
          placeholder="Optional — what you learned, how you got it, advice for someone one step behind."
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending || !draft.title.trim()}>
          {pending && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function JourneyEditor({
  userId,
  initialEntries,
  suggestions,
  currentYear,
}: {
  userId: string;
  initialEntries: JourneyEntry[];
  suggestions: JourneySuggestion[];
  currentYear: number;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [editing, setEditing] = useState<string | null>(null); // entry id or "new"
  const [draft, setDraft] = useState<Draft>(emptyDraft(currentYear));
  const [importOpen, setImportOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const remainingSuggestions = useMemo(() => {
    const existing = new Set(entries.map((e) => `${e.year}|${e.title.trim().toLowerCase()}`));
    return suggestions.filter((s) => !existing.has(`${s.year}|${s.title.trim().toLowerCase()}`));
  }, [entries, suggestions]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = sortJourney(entries);

  const preview: TimelineEntry[] = useMemo(() => {
    const draftYear = Number(draft.year);
    const draftEntry =
      editing && draft.title.trim() && Number.isInteger(draftYear) && draftYear > 1900
        ? {
            id: editing === "new" ? "draft" : editing,
            year: draftYear,
            title: draft.title,
            subtitle: draft.subtitle || null,
            description: draft.description || null,
            highlight: true,
          }
        : null;
    const base: TimelineEntry[] = entries
      .filter((e) => !(draftEntry && e.id === editing))
      .map((e) => ({ id: e.id, year: e.year, title: e.title, subtitle: e.subtitle, description: e.description }));
    return draftEntry ? [...base, draftEntry] : base;
  }, [entries, editing, draft]);

  const startEdit = (entry: JourneyEntry) => {
    setEditing(entry.id);
    setDraft({
      year: String(entry.year),
      title: entry.title,
      subtitle: entry.subtitle ?? "",
      description: entry.description ?? "",
    });
  };

  const startNew = () => {
    const last = sorted[sorted.length - 1];
    setEditing("new");
    setDraft(emptyDraft(last ? Math.max(last.year, currentYear) : currentYear));
  };

  const save = () => {
    const id = editing === "new" ? undefined : editing ?? undefined;
    startTransition(async () => {
      const result = await saveJourneyEntry({
        id,
        year: Number(draft.year),
        title: draft.title,
        subtitle: draft.subtitle,
        description: draft.description,
      });
      if (result.error || !result.entry) {
        toast.error(result.error ?? "Could not save this milestone.");
        return;
      }
      const saved = result.entry;
      setEntries((prev) => (id ? prev.map((e) => (e.id === id ? saved : e)) : [...prev, saved]));
      setEditing(null);
      toast.success(id ? "Milestone updated" : "Milestone added");
    });
  };

  const remove = (entry: JourneyEntry) => {
    if (!window.confirm(`Delete "${entry.year} ${entry.title}" from your journey?`)) return;
    startTransition(async () => {
      const result = await deleteJourneyEntry(entry.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      if (editing === entry.id) setEditing(null);
      toast.success("Milestone deleted");
    });
  };

  const openImport = () => {
    setSelected(new Set(remainingSuggestions.map((s) => s.key)));
    setImportOpen(true);
  };

  const runImport = () => {
    const chosen = remainingSuggestions.filter((s) => selected.has(s.key));
    if (chosen.length === 0) return;
    startTransition(async () => {
      const result = await addJourneyEntries(
        chosen.map(({ year, title, subtitle, description }) => ({ year, title, subtitle, description })),
      );
      if (result.error || !result.entries) {
        toast.error(result.error ?? "Could not add these milestones.");
        return;
      }
      setEntries((prev) => [...prev, ...result.entries!]);
      setImportOpen(false);
      toast.success(`Added ${result.entries.length} ${result.entries.length === 1 ? "milestone" : "milestones"} from your profile`);
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <section className="space-y-4">
        <div className="rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Your milestones</h2>
              <p className="text-sm text-muted-foreground">Education, internships, jobs and the next step you&apos;re working towards.</p>
            </div>
            {remainingSuggestions.length > 0 && (
              <Button variant="outline" size="sm" onClick={openImport}>
                <Wand2 /> Start from my profile
              </Button>
            )}
          </div>

          {sorted.length === 0 && editing !== "new" ? (
            <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center">
              <span className="mb-3 rounded-full bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                <Route className="h-6 w-6" aria-hidden />
              </span>
              <p className="font-medium">Tell the story of how you got here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                e.g. 2024 Bachelor of Computer Science → 2025 Data Analyst Intern → 2026 Master of Data Science → 2027
                Graduate Data Scientist.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {remainingSuggestions.length > 0 && (
                  <Button onClick={openImport}>
                    <Wand2 /> Start from my profile
                  </Button>
                )}
                <Button variant={remainingSuggestions.length > 0 ? "outline" : "default"} onClick={startNew}>
                  <Plus /> Add a milestone
                </Button>
              </div>
            </div>
          ) : (
            <ul className="mt-5 space-y-2">
              {sorted.map((entry) =>
                editing === entry.id ? (
                  <li key={entry.id}>
                    <EntryForm
                      draft={draft}
                      onChange={setDraft}
                      onCancel={() => setEditing(null)}
                      onSubmit={save}
                      pending={pending}
                      submitLabel="Save changes"
                    />
                  </li>
                ) : (
                  <li
                    key={entry.id}
                    className="flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-accent/50"
                  >
                    <span
                      className={cn(
                        "mt-0.5 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                        entry.year > currentYear
                          ? "border border-dashed border-emerald-500/60 text-emerald-700 dark:text-emerald-300"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                      )}
                    >
                      {entry.year}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{entry.title}</p>
                      {entry.subtitle && <p className="truncate text-xs text-muted-foreground">{entry.subtitle}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Edit ${entry.title}`}
                        disabled={pending}
                        onClick={() => startEdit(entry)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${entry.title}`}
                        disabled={pending}
                        onClick={() => remove(entry)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ),
              )}
              {editing === "new" ? (
                <li>
                  <EntryForm
                    draft={draft}
                    onChange={setDraft}
                    onCancel={() => setEditing(null)}
                    onSubmit={save}
                    pending={pending}
                    submitLabel="Add milestone"
                  />
                </li>
              ) : (
                <li>
                  <Button variant="outline" className="w-full border-dashed" onClick={startNew} disabled={pending}>
                    <Plus /> Add a milestone
                  </Button>
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> Make it useful for others
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Add the step you&apos;re working towards — future years show as your &quot;Next step&quot;.</li>
            <li>Mention what made the difference: a project, a course, a referral, a club.</li>
            <li>Your journey is visible to signed-in members on your profile.</li>
          </ul>
        </div>
      </section>

      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <div className="rounded-xl border bg-card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> Live preview
            </p>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/u/${userId}#journey`}>View on profile</Link>
            </Button>
          </div>
          {preview.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              Your timeline appears here as you add milestones.
            </p>
          ) : (
            <JourneyTimeline entries={preview} currentYear={currentYear} />
          )}
        </div>
      </aside>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Start from your Career Profile</DialogTitle>
            <DialogDescription>
              We found these milestones in your education, experience and career goal. Choose what to add — you can edit them
              afterwards.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {remainingSuggestions.map((s) => {
              const checked = selected.has(s.key);
              return (
                <li key={s.key}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                      checked ? "border-emerald-500/50 bg-emerald-500/5" : "hover:bg-accent/50",
                    )}
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={checked}
                      onCheckedChange={(value) =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (value) next.add(s.key);
                          else next.delete(s.key);
                          return next;
                        })
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        <span className="tabular-nums text-emerald-700 dark:text-emerald-400">{s.year}</span> {s.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {[s.subtitle, s.source].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={runImport} disabled={pending || selected.size === 0}>
              {pending && <Loader2 className="animate-spin" />}
              Add {selected.size} {selected.size === 1 ? "milestone" : "milestones"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
