"use client";

import { startTransition, useActionState } from "react";
import { CircleAlert, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveCompany, type FormState } from "@/lib/actions/employer";
import type { Company } from "@/lib/types";

const SIZES = ["1-10", "11-50", "51-200", "201-500", "500-1,000", "1,000-5,000", "5,000+"];
const INDUSTRIES = [
  "Software / SaaS",
  "Technology",
  "Data & Analytics",
  "Financial Services",
  "Consulting",
  "Health Technology",
  "Cloud Services",
  "Cybersecurity",
  "Education",
  "Government",
  "Retail & E-commerce",
  "Media & Entertainment",
  "Telecommunications",
  "Mining & Resources",
];

export const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive dark:text-red-400">{message}</p>;
}

export function CompanyForm({ company }: { company: Company | null }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveCompany, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form
      onSubmit={(e) => {
        // Submit manually so a validation error doesn't reset what was typed.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Company name *</Label>
          <Input id="name" name="name" required maxLength={120} defaultValue={company?.name ?? ""} placeholder="e.g. Acme Analytics" aria-invalid={Boolean(errors.name)} />
          <FieldError message={errors.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" name="industry" list="industry-options" maxLength={120} defaultValue={company?.industry ?? ""} placeholder="e.g. Software / SaaS" />
          <datalist id="industry-options">
            {INDUSTRIES.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" maxLength={120} defaultValue={company?.location ?? ""} placeholder="e.g. Sydney, NSW" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="size">Company size</Label>
          <select id="size" name="size" defaultValue={company?.size ?? ""} className={selectClass}>
            <option value="">Select size</option>
            {[...new Set([...(company?.size && !SIZES.includes(company.size) ? [company.size] : []), ...SIZES])].map((s) => (
              <option key={s} value={s}>
                {s} employees
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" maxLength={200} defaultValue={company?.website ?? ""} placeholder="https://example.com" aria-invalid={Boolean(errors.website)} />
          <FieldError message={errors.website} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">About the company</Label>
          <Textarea
            id="description"
            name="description"
            rows={5}
            maxLength={4000}
            defaultValue={company?.description ?? ""}
            placeholder="What you do, your culture, and what early-career people can learn with you."
          />
        </div>
      </div>
      {state.error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive dark:text-red-300">
          <CircleAlert className="h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {pending ? "Saving…" : company ? "Save changes" : "Create company"}
        </Button>
      </div>
    </form>
  );
}
