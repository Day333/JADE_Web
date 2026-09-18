"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Target, X } from "lucide-react";
import { MatchBadge } from "@/components/app/match";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ExplorerCareer {
  id: string;
  title: string;
  field: string;
  summary: string;
  score: number;
  isGoal: boolean;
}

/** Every career in the catalogue, grouped by field, with search and a field filter. */
export function CareerExplorer({ careers }: { careers: ExplorerCareer[] }) {
  const [query, setQuery] = useState("");
  const [field, setField] = useState<string>("all");
  const deferredQuery = useDeferredValue(query);

  const fields = useMemo(() => [...new Set(careers.map((c) => c.field))].sort(), [careers]);

  const groups = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const filtered = careers.filter(
      (c) =>
        (field === "all" || c.field === field) &&
        (!q || c.title.toLowerCase().includes(q) || c.field.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q)),
    );
    const byField = new Map<string, ExplorerCareer[]>();
    for (const c of filtered) byField.set(c.field, [...(byField.get(c.field) ?? []), c]);
    return [...byField.entries()]
      .map(([name, list]) => ({ name, careers: list.sort((a, b) => b.score - a.score) }))
      // Fields where the user's best match is highest come first.
      .sort((a, b) => b.careers[0].score - a.careers[0].score || a.name.localeCompare(b.name));
  }, [careers, deferredQuery, field]);

  const total = groups.reduce((n, g) => n + g.careers.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search careers…"
            aria-label="Search careers"
            className="pl-8"
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0" role="group" aria-label="Filter by field">
          {["all", ...fields].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setField(f)}
              aria-pressed={field === f}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                field === f
                  ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-emerald-950"
                  : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {f === "all" ? "All fields" : f}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total} {total === 1 ? "career" : "careers"}
        {field !== "all" && <> in {field}</>}
        {deferredQuery.trim() && <> matching “{deferredQuery.trim()}”</>}
      </p>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center">
          <p className="font-medium">No careers match your search</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setField("all");
            }}
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            <X className="h-4 w-4" aria-hidden /> Clear filters
          </button>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.name} aria-label={group.name} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {group.name} <span className="font-normal normal-case tracking-normal">· {group.careers.length}</span>
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.careers.map((career) => (
                <Link
                  key={career.id}
                  href={`/careers/${career.id}`}
                  className={cn(
                    "group flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-emerald-500/40 hover:bg-accent/40",
                    career.isGoal && "border-emerald-500/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                      {career.title}
                    </span>
                    <MatchBadge score={career.score} className="shrink-0 whitespace-nowrap" />
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{career.summary}</p>
                  {career.isGoal && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <Target className="h-3.5 w-3.5" aria-hidden /> Your current goal
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
