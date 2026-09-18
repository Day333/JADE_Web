"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

export interface JobFilterValues {
  q?: string;
  location?: string;
  career?: string;
  industry?: string;
  company?: string;
  type?: string;
  level?: string;
  grad?: string;
  sort?: string;
}

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function FilterSelect({
  name,
  label,
  options,
  value,
  anyLabel,
  onChange,
}: {
  name: keyof JobFilterValues;
  label: string;
  options: FilterOption[];
  value?: string;
  anyLabel: string;
  onChange: () => void;
}) {
  const id = `filter-${name}`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select id={id} name={name} defaultValue={value ?? ""} onChange={onChange} className={cn(selectClass, value && "border-emerald-500/50")}>
        <option value="">{anyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** GET form that updates the /jobs URL (auto-submits when a filter changes). */
export function JobFilters({
  values,
  options,
}: {
  values: JobFilterValues;
  options: {
    location: FilterOption[];
    career: FilterOption[];
    industry: FilterOption[];
    company: FilterOption[];
    type: FilterOption[];
    level: FilterOption[];
    grad: FilterOption[];
  };
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const submit = () => formRef.current?.requestSubmit();
  const active = Object.entries(values).filter(([k, v]) => k !== "sort" && v).length;

  return (
    <form
      ref={formRef}
      action="/jobs"
      method="get"
      aria-busy={pending}
      onSubmit={(e) => {
        // Navigate client-side with only the filters that are set (clean, shareable URLs).
        e.preventDefault();
        const params = new URLSearchParams();
        for (const [key, value] of new FormData(e.currentTarget)) {
          const v = String(value).trim();
          if (v && !(key === "sort" && v === "match")) params.set(key, v);
        }
        const qs = params.toString();
        startTransition(() => router.push(`/jobs${qs ? `?${qs}` : ""}#browse`, { scroll: false }));
      }}
      className={cn("rounded-xl border bg-card p-4 transition-opacity sm:p-5", pending && "opacity-70")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <label htmlFor="filter-q" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="filter-q" name="q" defaultValue={values.q ?? ""} placeholder="Job title, company or skill" className="pl-8" />
          </div>
        </div>
        <div className="space-y-1 sm:w-48">
          <label htmlFor="filter-sort" className="text-xs font-medium text-muted-foreground">
            Sort by
          </label>
          <select id="filter-sort" name="sort" defaultValue={values.sort ?? "match"} onChange={submit} className={selectClass}>
            <option value="match">Best match</option>
            <option value="newest">Newest</option>
          </select>
        </div>
        <Button type="submit" className="sm:w-auto">
          <SlidersHorizontal />
          Apply
        </Button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <FilterSelect name="location" label="Location" options={options.location} value={values.location} anyLabel="Any location" onChange={submit} />
        <FilterSelect name="career" label="Career" options={options.career} value={values.career} anyLabel="Any career" onChange={submit} />
        <FilterSelect name="industry" label="Industry" options={options.industry} value={values.industry} anyLabel="Any industry" onChange={submit} />
        <FilterSelect name="company" label="Company" options={options.company} value={values.company} anyLabel="Any company" onChange={submit} />
        <FilterSelect name="type" label="Job type" options={options.type} value={values.type} anyLabel="Any type" onChange={submit} />
        <FilterSelect name="level" label="Experience level" options={options.level} value={values.level} anyLabel="Any level" onChange={submit} />
        <FilterSelect name="grad" label="Graduation year" options={options.grad} value={values.grad} anyLabel="Any year" onChange={submit} />
      </div>
      {active > 0 && (
        <div className="mt-3 flex justify-end">
          <Link href="/jobs#browse" scroll={false} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
            Clear {active} filter{active === 1 ? "" : "s"}
          </Link>
        </div>
      )}
    </form>
  );
}
