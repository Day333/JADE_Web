import type { ApplicationStatus, JobType, PostType } from "@/lib/types";

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  // Ignore tokens like "(test)" or emoji so initials stay letters.
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => /^\p{L}/u.test(p));
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function timeAgo(iso: string | Date) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function formatDate(iso: string | Date, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleDateString("en-AU", options);
}

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  internship: "Internship",
  graduate: "Graduate Program",
  part_time: "Part-time",
  full_time: "Full-time",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  viewed: "Viewed",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const POST_TYPE_LABELS: Record<PostType, string> = {
  experience: "Experience",
  career_journey: "Career Journey",
  interview: "Interview Experience",
  company_review: "Company Review",
  graduate_program: "Graduate Program",
  internship: "Internship",
  question: "Question",
  resource: "Resource",
};

/** Tailwind classes for a colour-coded application status pill. */
export function statusTone(status: ApplicationStatus) {
  switch (status) {
    case "offer":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "interview":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-300";
    case "screening":
    case "viewed":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
    case "applied":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "rejected":
    case "withdrawn":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}
