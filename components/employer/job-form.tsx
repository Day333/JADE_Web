"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { Building2, CircleAlert, Loader2, Save, Send, Sparkles } from "lucide-react";
import { FieldError, selectClass } from "@/components/employer/company-form";
import { SkillPicker, type SkillOption } from "@/components/employer/skill-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveJob, type FormState } from "@/lib/actions/employer";
import { JOB_TYPE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Job, JobType } from "@/lib/types";

export interface CareerOption {
  id: string;
  title: string;
  field: string;
  core: string[];
  important: string[];
}

const EXPERIENCE_LEVELS = ["Student", "Graduate", "Entry level (0-2 years)", "Junior (1-3 years)", "Mid level (3-5 years)"];

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function JobForm({
  job,
  company,
  skills,
  careers,
  gradYearOptions,
}: {
  job: Job | null;
  company: { name: string; industry: string | null; location: string | null };
  skills: SkillOption[];
  careers: CareerOption[];
  gradYearOptions: number[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveJob.bind(null, job?.id), {});
  const errors = state.fieldErrors ?? {};
  const [status, setStatus] = useState<string>(job?.status ?? "open");
  const [jobType, setJobType] = useState<JobType>(job?.job_type ?? "graduate");
  const [careerId, setCareerId] = useState(job?.career_id ?? "");
  const [required, setRequired] = useState<string[]>(job?.required_skills ?? []);
  const [preferred, setPreferred] = useState<string[]>(job?.preferred_skills ?? []);
  const career = careers.find((c) => c.id === careerId);
  const years = [...new Set([...gradYearOptions, ...(job?.grad_years ?? [])])].sort();

  const suggestSkills = () => {
    if (!career) return;
    setRequired((r) => [...new Set([...r, ...career.core])]);
    setPreferred((p) => [...new Set([...p, ...career.important])].filter((id) => !career.core.includes(id) && !required.includes(id)));
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="space-y-5"
    >
      <Card title="The role" description="The basics candidates see first.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Job title *</Label>
            <Input id="title" name="title" maxLength={120} defaultValue={job?.title ?? ""} placeholder="e.g. Graduate Data Analyst" aria-invalid={Boolean(errors.title)} />
            <FieldError message={errors.title} />
          </div>
          <div className="space-y-1.5">
            <Label>Company</Label>
            <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {company.name}
            </div>
            <p className="text-xs text-muted-foreground">
              Jobs are posted for your company.{" "}
              <Link href="/employer/company" className="underline-offset-4 hover:underline">
                Edit company
              </Link>
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" maxLength={120} defaultValue={job?.location ?? company.location ?? ""} placeholder="e.g. Sydney, NSW or Remote (Australia)" />
          </div>
          <fieldset className="space-y-1.5 sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium">Job type *</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(JOB_TYPE_LABELS) as JobType[]).map((t) => (
                <label
                  key={t}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-sm transition",
                    jobType === t ? "border-emerald-500 bg-emerald-500/10 font-medium text-emerald-800 dark:text-emerald-200" : "hover:bg-accent",
                  )}
                >
                  <input type="radio" name="job_type" value={t} checked={jobType === t} onChange={() => setJobType(t)} className="sr-only" />
                  {JOB_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
            <FieldError message={errors.job_type} />
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="career_id">Related career</Label>
            <select id="career_id" name="career_id" value={careerId} onChange={(e) => setCareerId(e.target.value)} className={selectClass}>
              <option value="">Not specified</option>
              {careers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Drives recommendations. Seekers with this career goal are notified when you publish.</p>
            <FieldError message={errors.career_id} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" name="industry" maxLength={120} defaultValue={job?.industry ?? company.industry ?? ""} placeholder="e.g. Financial Services" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="salary_range">Salary range</Label>
            <Input id="salary_range" name="salary_range" maxLength={120} defaultValue={job?.salary_range ?? ""} placeholder="e.g. $85,000-$95,000 + super" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deadline">Application deadline</Label>
            <Input id="deadline" name="deadline" type="date" defaultValue={job?.deadline ?? ""} aria-invalid={Boolean(errors.deadline)} />
            <FieldError message={errors.deadline} />
          </div>
        </div>
      </Card>

      <Card title="Description" description="Put one item per line in the lists.">
        <div className="space-y-1.5">
          <Label htmlFor="description">Job description {status === "open" && "*"}</Label>
          <Textarea
            id="description"
            name="description"
            rows={5}
            maxLength={10000}
            defaultValue={job?.description ?? ""}
            placeholder="What the team does, what this person will work on, and why it's a great first role."
            aria-invalid={Boolean(errors.description)}
          />
          <FieldError message={errors.description} />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="responsibilities">Responsibilities</Label>
            <Textarea id="responsibilities" name="responsibilities" rows={6} defaultValue={job?.responsibilities.join("\n") ?? ""} placeholder={"Build dashboards\nClean and model data\nPresent insights"} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="requirements">Requirements</Label>
            <Textarea id="requirements" name="requirements" rows={6} defaultValue={job?.requirements.join("\n") ?? ""} placeholder={"Strong SQL\nComfortable with Python\nClear communicator"} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preferred_qualifications">Preferred qualifications</Label>
            <Textarea
              id="preferred_qualifications"
              name="preferred_qualifications"
              rows={6}
              defaultValue={job?.preferred_qualifications.join("\n") ?? ""}
              placeholder={"Experience with Tableau\nA portfolio of projects"}
            />
          </div>
        </div>
      </Card>

      <Card title="Skills" description="Used to match and rank candidates. Pick from the skills catalogue.">
        {career && (
          <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Start from the skills a {career.title} typically needs.
            </span>
            <Button type="button" size="sm" variant="outline" onClick={suggestSkills}>
              Add suggested skills
            </Button>
          </div>
        )}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Required skills {status === "open" && "*"}</Label>
            <SkillPicker
              name="required_skills"
              options={skills}
              value={required}
              onChange={(ids) => {
                setRequired(ids);
                setPreferred((p) => p.filter((id) => !ids.includes(id)));
              }}
              exclude={preferred}
              placeholder="Search e.g. SQL, Python, Figma…"
              invalid={Boolean(errors.required_skills)}
            />
            <FieldError message={errors.required_skills} />
          </div>
          <div className="space-y-1.5">
            <Label>Preferred skills</Label>
            <SkillPicker
              name="preferred_skills"
              options={skills}
              value={preferred}
              onChange={setPreferred}
              exclude={required}
              tone="preferred"
              placeholder="Nice-to-have skills"
            />
          </div>
        </div>
      </Card>

      <Card title="Who it's for">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="experience_level">Experience requirement</Label>
            <Input id="experience_level" name="experience_level" list="experience-options" maxLength={120} defaultValue={job?.experience_level ?? ""} placeholder="e.g. Graduate" />
            <datalist id="experience-options">
              {EXPERIENCE_LEVELS.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="education_requirement">Education requirement</Label>
            <Input
              id="education_requirement"
              name="education_requirement"
              maxLength={200}
              defaultValue={job?.education_requirement ?? ""}
              placeholder="e.g. Degree in Computer Science or similar"
            />
          </div>
          <fieldset className="space-y-1.5 sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium">Graduation years</legend>
            <div className="flex flex-wrap gap-2">
              {years.map((y) => (
                <label key={y} className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-500/10">
                  <input type="checkbox" name="grad_years" value={y} defaultChecked={job?.grad_years.includes(y)} className="h-3.5 w-3.5 accent-emerald-600" />
                  {y}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Leave empty if the role is open to any graduation year.</p>
          </fieldset>
        </div>
      </Card>

      <Card title="Status">
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { value: "open", label: "Open", hint: "Visible on Jobs and matched to candidates" },
            { value: "draft", label: "Draft", hint: "Only you and your team can see it" },
            { value: "closed", label: "Closed", hint: "Hidden; no new applications" },
          ].map((s) => (
            <label
              key={s.value}
              className={cn(
                "cursor-pointer rounded-xl border p-3 transition",
                status === s.value ? "border-emerald-500 bg-emerald-500/5" : "hover:bg-accent/50",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <input type="radio" name="status" value={s.value} checked={status === s.value} onChange={() => setStatus(s.value)} className="accent-emerald-600" />
                {s.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{s.hint}</span>
            </label>
          ))}
        </div>
      </Card>

      {state.error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive dark:text-red-300">
          <CircleAlert className="h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-2 border-t bg-background/90 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-end sm:rounded-2xl sm:border sm:px-4">
        <Button asChild variant="ghost">
          <Link href={job ? `/employer/jobs/${job.id}/candidates` : "/employer"}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending} size="lg">
          {pending ? <Loader2 className="animate-spin" /> : status === "open" ? <Send /> : <Save />}
          {pending ? "Saving…" : job ? (status === "open" && job.status !== "open" ? "Save & publish" : "Save changes") : status === "open" ? "Publish job" : "Save job"}
        </Button>
      </div>
    </form>
  );
}
