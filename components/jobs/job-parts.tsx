import { Briefcase, CalendarClock, DollarSign, GraduationCap, MapPin } from "lucide-react";
import { APPLICATION_STATUS_LABELS, JOB_TYPE_LABELS, formatDate, statusTone } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApplicationStatus, Job } from "@/lib/types";

const MARK_TONES = [
  "from-emerald-500 to-teal-600",
  "from-cyan-500 to-sky-600",
  "from-violet-500 to-indigo-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-lime-500 to-green-600",
];

/** Square company monogram (no logos in v1). */
export function CompanyMark({ name, className }: { name: string | null | undefined; className?: string }) {
  const label = (name ?? "?").trim();
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  const letters = label
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-sm font-bold text-white shadow-sm",
        MARK_TONES[hash % MARK_TONES.length],
        className,
      )}
    >
      {letters || "?"}
    </span>
  );
}

/** Subtle tag for fictional sample listings. */
export function SampleTag({ className }: { className?: string }) {
  return (
    <span
      title="Sample listing from a fictional company"
      className={cn(
        "inline-flex items-center rounded border border-dashed px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      Sample
    </span>
  );
}

export function StatusPill({ status, className }: { status: ApplicationStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", statusTone(status), className)}>
      {APPLICATION_STATUS_LABELS[status]}
    </span>
  );
}

/** Location · type · salary · deadline row. */
export function JobMeta({
  job,
  showSalary = false,
  showDeadline = false,
  showGradYears = false,
  className,
}: {
  job: Pick<Job, "location" | "job_type" | "salary_range" | "deadline" | "grad_years">;
  showSalary?: boolean;
  showDeadline?: boolean;
  showGradYears?: boolean;
  className?: string;
}) {
  const items: { icon: React.ComponentType<{ className?: string }>; label: string }[] = [];
  if (job.location) items.push({ icon: MapPin, label: job.location });
  items.push({ icon: Briefcase, label: JOB_TYPE_LABELS[job.job_type] });
  if (showSalary && job.salary_range) items.push({ icon: DollarSign, label: job.salary_range });
  if (showGradYears && job.grad_years.length > 0) {
    items.push({ icon: GraduationCap, label: `${job.grad_years.join(", ")} grads` });
  }
  if (showDeadline && job.deadline) items.push({ icon: CalendarClock, label: `Apply by ${formatDate(job.deadline)}` });
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground", className)}>
      {items.map(({ icon: Icon, label }) => (
        <li key={label} className="inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  );
}

/** Days until a deadline, or null. Negative when passed. */
export function daysUntil(date: string | null) {
  if (!date) return null;
  const end = new Date(`${date}T23:59:59`);
  return Math.ceil((end.getTime() - Date.now()) / 86_400_000);
}
