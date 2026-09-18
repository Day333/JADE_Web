"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SkillOption {
  id: string;
  name: string;
  category: string;
  aliases: string[];
}

/** Searchable multi-select over the skills catalogue. Submits one `name` field per selected skill. */
export function SkillPicker({
  name,
  options,
  value,
  onChange,
  exclude = [],
  placeholder = "Search skills…",
  tone = "required",
  invalid,
}: {
  name: string;
  options: SkillOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** Skills chosen in another picker (hidden from suggestions). */
  exclude?: string[];
  placeholder?: string;
  tone?: "required" | "preferred";
  invalid?: boolean;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const taken = new Set([...value, ...exclude]);
    return options
      .filter((o) => !taken.has(o.id))
      .filter((o) => !q || o.name.toLowerCase().includes(q) || o.aliases.some((a) => a.replace(/^=/, "").toLowerCase().includes(q)))
      .sort((a, b) => {
        if (!q) return a.name.localeCompare(b.name);
        const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        return aStarts - bStarts || a.name.localeCompare(b.name);
      })
      .slice(0, 8);
  }, [options, query, value, exclude]);

  const add = (id: string) => {
    if (!value.includes(id)) onChange([...value, id]);
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
  };
  const remove = (id: string) => onChange(value.filter((v) => v !== id));

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected skills">
          {value.map((id) => (
            <li key={id}>
              <input type="hidden" name={name} value={id} />
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border py-0.5 pl-2 pr-1 text-xs font-medium",
                  tone === "required"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                    : "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200",
                )}
              >
                {byId.get(id)?.name ?? id}
                <button
                  type="button"
                  onClick={() => remove(id)}
                  className="rounded p-0.5 hover:bg-foreground/10"
                  aria-label={`Remove ${byId.get(id)?.name ?? id}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (suggestions[active]) add(suggestions[active].id);
            } else if (e.key === "Escape") {
              setOpen(false);
            } else if (e.key === "Backspace" && !query && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent py-1 pl-8 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            invalid && "border-destructive",
          )}
        />
        {open && suggestions.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(s.id);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm",
                  i === active && "bg-accent text-accent-foreground",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  {s.name}
                </span>
                <span className="text-[11px] capitalize text-muted-foreground">{s.category}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
