"use client";

import { useId, useState, type ReactNode } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Pill } from "@/components/profile/pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ItemFormProps } from "@/components/profile/editable-list";
import {
  EXPERIENCE_KINDS,
  EXPERIENCE_KIND_LABELS,
  PORTFOLIO_KINDS,
  displayUrl,
  splitList,
  type BasicsInput,
  type CertificationInput,
  type EducationInput,
  type ExperienceInput,
  type LinksInput,
  type PortfolioInput,
  type ProjectInput,
} from "@/components/profile/model";

export const nativeSelectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-background";

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

export function Field({
  label,
  children,
  className,
  hint,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  hint?: string;
  htmlFor: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function FormActions({ onCancel, pending, submitLabel = "Save" }: { onCancel?: () => void; pending: boolean; submitLabel?: string }) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      {onCancel && (
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {submitLabel}
      </Button>
    </div>
  );
}

function useFormState<T>(initial: T) {
  const [value, setValue] = useState(initial);
  const set =
    <K extends keyof T>(key: K) =>
    (e: { target: { value: string } }) =>
      setValue((v) => ({ ...v, [key]: e.target.value }));
  return [value, setValue, set] as const;
}

function submitHandler<T>(value: T, onSubmit: (v: T) => void) {
  return (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(value);
  };
}

function Dates({ start, end }: { start?: string | null; end?: string | null }) {
  if (!start && !end) return null;
  return (
    <span className="whitespace-nowrap text-xs text-muted-foreground">
      {start}
      {start && end ? " – " : ""}
      {end}
    </span>
  );
}

function LinkOut({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex max-w-full items-center gap-1 truncate text-xs text-emerald-700 hover:underline dark:text-emerald-400"
    >
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{displayUrl(href)}</span>
    </a>
  );
}

function Description({ text }: { text?: string | null }) {
  if (!text) return null;
  const lines = text.split("\n").filter(Boolean);
  if (lines.length > 1) {
    return (
      <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm text-muted-foreground marker:text-muted-foreground/60">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    );
  }
  return <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{text}</p>;
}

// ---------------------------------------------------------------------------
// Basic information & links
// ---------------------------------------------------------------------------

export function BasicsFields({
  value,
  onChange,
}: {
  value: BasicsInput;
  onChange: (next: BasicsInput) => void;
}) {
  const id = useId();
  const set = (key: keyof BasicsInput) => (e: { target: { value: string } }) => onChange({ ...value, [key]: e.target.value });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name *" htmlFor={`${id}-name`}>
        <Input id={`${id}-name`} value={value.fullName} onChange={set("fullName")} required maxLength={100} autoComplete="name" />
      </Field>
      <Field label="Headline" htmlFor={`${id}-headline`}>
        <Input
          id={`${id}-headline`}
          value={value.headline}
          onChange={set("headline")}
          maxLength={140}
          placeholder="Data Science student · aspiring ML Engineer"
        />
      </Field>
      <Field label="Location" htmlFor={`${id}-location`}>
        <Input id={`${id}-location`} value={value.location} onChange={set("location")} maxLength={100} placeholder="Sydney, NSW" />
      </Field>
      <Field label="University" htmlFor={`${id}-uni`}>
        <Input id={`${id}-uni`} value={value.university} onChange={set("university")} maxLength={150} />
      </Field>
      <Field label="Degree" htmlFor={`${id}-degree`}>
        <Input id={`${id}-degree`} value={value.degree} onChange={set("degree")} maxLength={150} placeholder="Master of Data Science" />
      </Field>
      <Field label="Major" htmlFor={`${id}-major`}>
        <Input id={`${id}-major`} value={value.major} onChange={set("major")} maxLength={150} placeholder="Data Science" />
      </Field>
      <Field label="Graduation year" htmlFor={`${id}-grad`}>
        <Input
          id={`${id}-grad`}
          value={value.graduationYear}
          onChange={set("graduationYear")}
          inputMode="numeric"
          pattern="(19|20|21)[0-9]{2}"
          title="A year like 2026"
          maxLength={4}
          placeholder="2026"
        />
      </Field>
      <Field label="About me" htmlFor={`${id}-bio`} className="sm:col-span-2">
        <Textarea
          id={`${id}-bio`}
          value={value.bio}
          onChange={set("bio")}
          rows={3}
          maxLength={1500}
          placeholder="A short summary of who you are and what you're looking for."
        />
      </Field>
    </div>
  );
}

export function BasicsForm({ initial, onSubmit, onCancel, pending }: ItemFormProps<BasicsInput>) {
  const [value, setValue] = useState(initial);
  return (
    <form onSubmit={submitHandler(value, onSubmit)} className="space-y-4">
      <BasicsFields value={value} onChange={setValue} />
      <FormActions onCancel={onCancel} pending={pending} />
    </form>
  );
}

export function LinksFields({ value, onChange }: { value: LinksInput; onChange: (next: LinksInput) => void }) {
  const id = useId();
  const set = (key: keyof LinksInput) => (e: { target: { value: string } }) => onChange({ ...value, [key]: e.target.value });
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="GitHub" htmlFor={`${id}-gh`}>
        <Input id={`${id}-gh`} value={value.github} onChange={set("github")} inputMode="url" placeholder="github.com/you" />
      </Field>
      <Field label="LinkedIn" htmlFor={`${id}-li`}>
        <Input id={`${id}-li`} value={value.linkedin} onChange={set("linkedin")} inputMode="url" placeholder="linkedin.com/in/you" />
      </Field>
      <Field label="Website" htmlFor={`${id}-web`}>
        <Input id={`${id}-web`} value={value.website} onChange={set("website")} inputMode="url" placeholder="yourname.dev" />
      </Field>
    </div>
  );
}

export function LinksForm({ initial, onSubmit, onCancel, pending }: ItemFormProps<LinksInput>) {
  const [value, setValue] = useState(initial);
  return (
    <form onSubmit={submitHandler(value, onSubmit)} className="space-y-4">
      <LinksFields value={value} onChange={setValue} />
      <FormActions onCancel={onCancel} pending={pending} />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Education
// ---------------------------------------------------------------------------

export function EducationForm({ initial, onSubmit, onCancel, pending }: ItemFormProps<EducationInput>) {
  const id = useId();
  const [value, , set] = useFormState(initial);
  const [courses, setCourses] = useState(initial.courses.join(", "));
  return (
    <form onSubmit={submitHandler({ ...value, courses: splitList(courses) }, onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="School / university *" htmlFor={`${id}-school`} className="sm:col-span-2">
          <Input id={`${id}-school`} value={value.school} onChange={set("school")} required maxLength={150} autoFocus />
        </Field>
        <Field label="Degree" htmlFor={`${id}-degree`}>
          <Input id={`${id}-degree`} value={value.degree} onChange={set("degree")} maxLength={150} placeholder="Bachelor of Science" />
        </Field>
        <Field label="Field of study" htmlFor={`${id}-field`}>
          <Input id={`${id}-field`} value={value.field} onChange={set("field")} maxLength={150} placeholder="Statistics" />
        </Field>
        <Field label="Start" htmlFor={`${id}-start`}>
          <Input id={`${id}-start`} value={value.startDate} onChange={set("startDate")} maxLength={40} placeholder="Feb 2023" />
        </Field>
        <Field label="End (or expected)" htmlFor={`${id}-end`}>
          <Input id={`${id}-end`} value={value.endDate} onChange={set("endDate")} maxLength={40} placeholder="Dec 2026" />
        </Field>
        <Field label="Relevant courses" htmlFor={`${id}-courses`} hint="Separate with commas" className="sm:col-span-2">
          <Input id={`${id}-courses`} value={courses} onChange={(e) => setCourses(e.target.value)} placeholder="Machine Learning, Databases" />
        </Field>
      </div>
      <FormActions onCancel={onCancel} pending={pending} />
    </form>
  );
}

export function EducationView({ item }: { item: EducationInput }) {
  const title = [item.degree, item.field && !item.degree?.includes(item.field) ? item.field : null].filter(Boolean).join(" · ");
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="font-medium">{item.school}</p>
        <Dates start={item.startDate} end={item.endDate} />
      </div>
      {title && <p className="text-sm text-muted-foreground">{title}</p>}
      {item.courses.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.courses.map((c) => (
            <Pill key={c} variant="secondary" className="font-normal">
              {c}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------

export function ExperienceForm({ initial, onSubmit, onCancel, pending }: ItemFormProps<ExperienceInput>) {
  const id = useId();
  const [value, , set] = useFormState(initial);
  return (
    <form onSubmit={submitHandler(value, onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title *" htmlFor={`${id}-title`}>
          <Input id={`${id}-title`} value={value.title} onChange={set("title")} required maxLength={120} autoFocus placeholder="Data Analyst Intern" />
        </Field>
        <Field label="Organisation" htmlFor={`${id}-org`}>
          <Input id={`${id}-org`} value={value.organization} onChange={set("organization")} maxLength={120} />
        </Field>
        <Field label="Type" htmlFor={`${id}-kind`}>
          <select id={`${id}-kind`} value={value.kind} onChange={set("kind")} className={nativeSelectClass}>
            {EXPERIENCE_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start" htmlFor={`${id}-start`}>
            <Input id={`${id}-start`} value={value.startDate} onChange={set("startDate")} maxLength={40} placeholder="Dec 2023" />
          </Field>
          <Field label="End" htmlFor={`${id}-end`}>
            <Input id={`${id}-end`} value={value.endDate} onChange={set("endDate")} maxLength={40} placeholder="Present" />
          </Field>
        </div>
        <Field
          label="What did you do?"
          htmlFor={`${id}-desc`}
          hint="One achievement per line. Skills you mention are picked up automatically."
          className="sm:col-span-2"
        >
          <Textarea id={`${id}-desc`} value={value.description} onChange={set("description")} rows={4} maxLength={4000} />
        </Field>
      </div>
      <FormActions onCancel={onCancel} pending={pending} />
    </form>
  );
}

export function ExperienceView({ item, skillName }: { item: ExperienceInput; skillName?: (id: string) => string }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="font-medium">
          {item.title}
          {item.organization && <span className="font-normal text-muted-foreground"> · {item.organization}</span>}
        </p>
        <Dates start={item.startDate} end={item.endDate} />
      </div>
      <Pill variant="outline" className="mt-1 font-normal">
        {EXPERIENCE_KIND_LABELS[item.kind]}
      </Pill>
      <Description text={item.description} />
      {skillName && item.skills.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">Skills used:</span> {item.skills.map(skillName).join(", ")}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function ProjectForm({ initial, onSubmit, onCancel, pending }: ItemFormProps<ProjectInput>) {
  const id = useId();
  const [value, , set] = useFormState(initial);
  return (
    <form onSubmit={submitHandler(value, onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Project name *" htmlFor={`${id}-name`}>
          <Input id={`${id}-name`} value={value.name} onChange={set("name")} required maxLength={120} autoFocus />
        </Field>
        <Field label="Your role" htmlFor={`${id}-role`}>
          <Input id={`${id}-role`} value={value.role} onChange={set("role")} maxLength={120} placeholder="Solo project, team lead…" />
        </Field>
        <Field label="Link" htmlFor={`${id}-url`} className="sm:col-span-2">
          <Input id={`${id}-url`} value={value.url} onChange={set("url")} inputMode="url" maxLength={500} placeholder="github.com/you/project" />
        </Field>
        <Field label="Description" htmlFor={`${id}-desc`} hint="What it does, how you built it and the result." className="sm:col-span-2">
          <Textarea id={`${id}-desc`} value={value.description} onChange={set("description")} rows={4} maxLength={4000} />
        </Field>
      </div>
      <FormActions onCancel={onCancel} pending={pending} />
    </form>
  );
}

export function ProjectView({ item, skillName }: { item: ProjectInput; skillName?: (id: string) => string }) {
  return (
    <div>
      <p className="font-medium">
        {item.name}
        {item.role && <span className="font-normal text-muted-foreground"> · {item.role}</span>}
      </p>
      {item.url && <LinkOut href={item.url} />}
      <Description text={item.description} />
      {skillName && item.skills.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">Skills used:</span> {item.skills.map(skillName).join(", ")}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Certifications
// ---------------------------------------------------------------------------

export function CertificationForm({ initial, onSubmit, onCancel, pending }: ItemFormProps<CertificationInput>) {
  const id = useId();
  const [value, , set] = useFormState(initial);
  return (
    <form onSubmit={submitHandler(value, onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Certification *" htmlFor={`${id}-name`} className="sm:col-span-2">
          <Input id={`${id}-name`} value={value.name} onChange={set("name")} required maxLength={160} autoFocus />
        </Field>
        <Field label="Issuer" htmlFor={`${id}-issuer`}>
          <Input id={`${id}-issuer`} value={value.issuer} onChange={set("issuer")} maxLength={120} />
        </Field>
        <Field label="Year" htmlFor={`${id}-year`}>
          <Input id={`${id}-year`} value={value.year} onChange={set("year")} maxLength={20} placeholder="2025" />
        </Field>
        <Field label="Credential link" htmlFor={`${id}-url`} className="sm:col-span-2">
          <Input id={`${id}-url`} value={value.url} onChange={set("url")} inputMode="url" maxLength={500} />
        </Field>
      </div>
      <FormActions onCancel={onCancel} pending={pending} />
    </form>
  );
}

export function CertificationView({ item }: { item: CertificationInput }) {
  return (
    <div>
      <p className="font-medium">{item.name}</p>
      <p className="text-sm text-muted-foreground">{[item.issuer, item.year].filter(Boolean).join(" · ")}</p>
      {item.url && <LinkOut href={item.url} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export function PortfolioForm({ initial, onSubmit, onCancel, pending }: ItemFormProps<PortfolioInput>) {
  const id = useId();
  const [value, , set] = useFormState(initial);
  return (
    <form onSubmit={submitHandler(value, onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title *" htmlFor={`${id}-title`}>
          <Input id={`${id}-title`} value={value.title} onChange={set("title")} required maxLength={120} autoFocus />
        </Field>
        <Field label="Type" htmlFor={`${id}-kind`}>
          <select id={`${id}-kind`} value={value.kind} onChange={set("kind")} className={nativeSelectClass}>
            {PORTFOLIO_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Link *" htmlFor={`${id}-url`} className="sm:col-span-2">
          <Input id={`${id}-url`} value={value.url} onChange={set("url")} required inputMode="url" maxLength={500} />
        </Field>
        <Field label="Description" htmlFor={`${id}-desc`} className="sm:col-span-2">
          <Textarea id={`${id}-desc`} value={value.description} onChange={set("description")} rows={2} maxLength={500} />
        </Field>
      </div>
      <FormActions onCancel={onCancel} pending={pending} />
    </form>
  );
}

export function PortfolioView({ item }: { item: PortfolioInput }) {
  return (
    <div>
      <p className="flex flex-wrap items-center gap-2 font-medium">
        {item.title}
        <Pill variant="outline" className="font-normal">
          {PORTFOLIO_KINDS.find((k) => k.value === item.kind)?.label ?? "Other"}
        </Pill>
      </p>
      <LinkOut href={item.url} />
      {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
    </div>
  );
}
