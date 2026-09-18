"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  LEVEL_OPTIONS,
  customSkillId,
  findSkillByName,
  type SkillCategory,
  type SkillOption,
} from "@/components/profile/model";
import type { SkillLevel } from "@/lib/types";

export interface PickedSkill {
  skillId: string;
  name: string;
  level: SkillLevel;
  isCustom: boolean;
  category: SkillCategory;
}

export function LevelSelect({
  value,
  onChange,
  label,
  className,
  disabled,
}: {
  value: number;
  onChange: (level: SkillLevel) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value) as SkillLevel)}
      className={cn(
        "h-7 rounded-md border border-input bg-transparent px-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 dark:bg-background",
        className,
      )}
    >
      {LEVEL_OPTIONS.map((l) => (
        <option key={l.value} value={l.value}>
          {l.label}
        </option>
      ))}
    </select>
  );
}

const LEVEL_TONE: Record<number, string> = {
  1: "border-border bg-secondary/60",
  2: "border-teal-500/30 bg-teal-500/5",
  3: "border-emerald-500/40 bg-emerald-500/10",
};

/** An editable skill: name, level select and remove button. */
export function EditableSkillChip({
  name,
  level,
  onLevel,
  onRemove,
  pending,
  badge,
}: {
  name: string;
  level: number;
  onLevel: (level: SkillLevel) => void;
  onRemove: () => void;
  pending?: boolean;
  badge?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border py-1 pl-2.5 pr-1 text-sm transition-colors",
        LEVEL_TONE[level] ?? LEVEL_TONE[2],
      )}
    >
      <span className="font-medium">{name}</span>
      {badge && <span className="rounded bg-muted px-1 text-[10px] uppercase tracking-wide text-muted-foreground">{badge}</span>}
      <LevelSelect value={level} onChange={onLevel} label={`${name} level`} disabled={pending} />
      <button
        type="button"
        onClick={onRemove}
        disabled={pending}
        aria-label={`Remove ${name}`}
        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
      </button>
    </span>
  );
}

/**
 * "Add Skill" with autocomplete from the skills catalogue. Anything that
 * isn't in the catalogue can be added as a custom skill.
 */
export function SkillAdder({
  options,
  excludeIds,
  onAdd,
  categories,
  customCategory = "technical",
  placeholder = "Search skills, e.g. Python, SQL, Figma…",
  pending,
}: {
  options: SkillOption[];
  excludeIds: Set<string>;
  onAdd: (skill: PickedSkill) => void | Promise<void>;
  /** Only suggest catalogue skills in these categories. */
  categories?: SkillCategory[];
  customCategory?: SkillCategory;
  placeholder?: string;
  pending?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const refocusing = useRef(false);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<SkillLevel>(2);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const pool = useMemo(
    () => options.filter((o) => !excludeIds.has(o.id) && (!categories || categories.includes(o.category))),
    [options, excludeIds, categories],
  );

  const q = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!q) return pool.slice(0, 8);
    const starts: SkillOption[] = [];
    const contains: SkillOption[] = [];
    for (const o of pool) {
      const names = [o.name.toLowerCase(), ...o.aliases.map((a) => a.replace(/^=/, "").toLowerCase())];
      if (names.some((n) => n.startsWith(q))) starts.push(o);
      else if (names.some((n) => n.includes(q))) contains.push(o);
    }
    return [...starts, ...contains].slice(0, 8);
  }, [pool, q]);

  const exact = q ? findSkillByName(options, q) : undefined;
  const canAddCustom = q.length >= 2 && !exact && Boolean(customSkillId(query));
  const entries: ({ kind: "skill"; skill: SkillOption } | { kind: "custom" })[] = [
    ...suggestions.map((skill) => ({ kind: "skill" as const, skill })),
    ...(canAddCustom ? [{ kind: "custom" as const }] : []),
  ];

  const pick = async (entry: (typeof entries)[number] | undefined) => {
    if (!entry) return;
    if (entry.kind === "skill") {
      await onAdd({ skillId: entry.skill.id, name: entry.skill.name, level, isCustom: false, category: entry.skill.category });
    } else {
      const name = query.trim().replace(/\s+/g, " ").slice(0, 60);
      await onAdd({ skillId: customSkillId(name), name, level, isCustom: true, category: customCategory });
    }
    setQuery("");
    setActive(0);
    setOpen(false);
    refocusing.current = true;
    inputRef.current?.focus();
    refocusing.current = false;
  };

  const addTyped = () => {
    if (exact && !excludeIds.has(exact.id)) return pick({ kind: "skill", skill: exact });
    if (exact) {
      setQuery("");
      return;
    }
    if (canAddCustom) return pick({ kind: "custom" });
    return pick(entries[active]);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={query}
          role="combobox"
          aria-expanded={open && entries.length > 0}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-label="Add a skill"
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => {
            if (!refocusing.current) setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, entries.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (!q) return;
              // An exact name match wins unless the user picked another suggestion with the arrow keys.
              if (open && entries[active] && !(exact && active === 0)) void pick(entries[active]);
              else void addTyped();
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {open && entries.length > 0 && (
          <ul
            id={`${id}-list`}
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-md border bg-popover p-1 text-sm shadow-md"
          >
            {entries.map((entry, i) => (
              <li
                key={entry.kind === "skill" ? entry.skill.id : "custom"}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  void pick(entry);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5",
                  i === active && "bg-accent text-accent-foreground",
                )}
              >
                {entry.kind === "skill" ? (
                  <>
                    <span>{entry.skill.name}</span>
                    <span className="text-xs capitalize text-muted-foreground">{entry.skill.category}</span>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" aria-hidden /> Add &ldquo;{query.trim()}&rdquo; as a custom skill
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex gap-2">
        <LevelSelect value={level} onChange={setLevel} label="Level for the new skill" className="h-9 px-2 text-sm" />
        <Button type="button" onClick={() => void addTyped()} disabled={!q || pending} className="shrink-0">
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
          Add Skill
        </Button>
      </div>
    </div>
  );
}
