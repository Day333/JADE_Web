"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { SubmitButton } from "@/components/app/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createRecruiterCompany, type CompanyFormState } from "@/lib/actions/onboarding";
import { INDUSTRY_OPTIONS, LOCATION_OPTIONS } from "@/lib/ai/questionnaire";

const SIZES = ["1–10 employees", "11–50 employees", "51–200 employees", "201–1,000 employees", "1,000+ employees"];

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-background";

export function CompanyForm() {
  const [state, action] = useActionState<CompanyFormState | undefined, FormData>(createRecruiterCompany, undefined);
  const v = state?.fields ?? {};

  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> {state.error}
        </p>
      )}
      <div className="grid gap-2">
        <Label htmlFor="company-name">Company name *</Label>
        <Input id="company-name" name="name" required minLength={2} maxLength={120} defaultValue={v.name} placeholder="Acme Analytics" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="company-industry">Industry</Label>
          <Input id="company-industry" name="industry" list="industry-options" maxLength={80} defaultValue={v.industry} placeholder="Technology" />
          <datalist id="industry-options">
            {INDUSTRY_OPTIONS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company-location">Location</Label>
          <Input id="company-location" name="location" list="location-options" maxLength={100} defaultValue={v.location} placeholder="Sydney" />
          <datalist id="location-options">
            {LOCATION_OPTIONS.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company-size">Company size</Label>
          <select id="company-size" name="size" defaultValue={v.size ?? ""} className={selectClass}>
            <option value="">Select…</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="company-website">Website</Label>
          <Input id="company-website" name="website" inputMode="url" maxLength={300} defaultValue={v.website} placeholder="acme.com" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="company-description">About the company</Label>
        <Textarea
          id="company-description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={v.description}
          placeholder="What does your company do, and what is it like to work there?"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="recruiter-title">Your title (optional)</Label>
        <Input id="recruiter-title" name="headline" maxLength={140} defaultValue={v.headline} placeholder="Talent Acquisition Lead" />
      </div>
      <div className="flex justify-end">
        <SubmitButton size="lg" pendingText="Creating your company…">
          Create company &amp; continue
        </SubmitButton>
      </div>
    </form>
  );
}
