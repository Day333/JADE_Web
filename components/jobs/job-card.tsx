import Link from "next/link";
import { ArrowRight, CircleCheck, Lightbulb, TrendingUp } from "lucide-react";
import { MatchBadge, SkillChip } from "@/components/app/match";
import { CompanyMark, JobMeta, SampleTag, StatusPill, daysUntil } from "@/components/jobs/job-parts";
import { SaveJobButton } from "@/components/jobs/save-job-button";
import { skillName } from "@/lib/data/catalog";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { JobMatch } from "@/lib/ai/matching";
import type { JobWithCompany } from "@/lib/data/jobs";
import type { ApplicationStatus, Catalog } from "@/lib/types";

function VerdictLine({ match }: { match: JobMatch }) {
  const Icon = match.verdict === "ready" ? CircleCheck : match.verdict === "good" ? TrendingUp : Lightbulb;
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-sm",
        match.verdict === "ready"
          ? "text-emerald-700 dark:text-emerald-300"
          : match.verdict === "good"
            ? "text-teal-700 dark:text-teal-300"
            : "text-muted-foreground",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{match.message}</span>
    </p>
  );
}

export function JobCard({
  job,
  match,
  catalog,
  levels,
  application,
  detailed = false,
}: {
  job: JobWithCompany;
  match: JobMatch;
  catalog: Catalog;
  levels: Map<string, number>;
  application?: { id: string; status: ApplicationStatus } | null;
  /** Show "Your strengths" / "Possible gaps" chips. */
  detailed?: boolean;
}) {
  const companyName = job.company?.name ?? "Company";
  const saved = application?.status === "saved";
  const tracked = application && application.status !== "saved";
  const days = daysUntil(job.deadline);
  // Skills at a basic level show up under gaps (as "improving"), not twice.
  const strengths = match.strengths.filter((id) => !match.gaps.some((g) => g.skillId === id));

  return (
    <article className="group relative flex h-full flex-col gap-4 rounded-xl border bg-card p-5 transition hover:border-emerald-500/40 hover:shadow-md">
      <div className="flex items-start gap-3">
        <CompanyMark name={companyName} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug">
            <Link href={`/jobs/${job.id}`} className="after:absolute after:inset-0 after:rounded-xl focus:outline-none">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <span className="truncate">{companyName}</span>
            {job.company?.is_sample && <SampleTag />}
          </p>
        </div>
        <MatchBadge score={match.score} className="shrink-0" />
      </div>

      <JobMeta job={job} />

      {detailed && (
        <div className="space-y-3">
          {strengths.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Your strengths</p>
              <div className="flex flex-wrap gap-1.5">
                {strengths.slice(0, 4).map((id) => (
                  <SkillChip key={id} name={skillName(catalog, id)} status="have" />
                ))}
                {strengths.length > 4 && (
                  <span className="self-center text-xs text-muted-foreground">+{strengths.length - 4}</span>
                )}
              </div>
            </div>
          )}
          {match.gaps.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Possible gaps</p>
              <div className="flex flex-wrap gap-1.5">
                {match.gaps.slice(0, 3).map((g) => (
                  <SkillChip
                    key={g.skillId}
                    name={skillName(catalog, g.skillId)}
                    status={(levels.get(g.skillId) ?? 0) > 0 ? "improving" : "gap"}
                  />
                ))}
                {match.gaps.length > 3 && <span className="self-center text-xs text-muted-foreground">+{match.gaps.length - 3}</span>}
              </div>
            </div>
          )}
        </div>
      )}

      <VerdictLine match={match} />

      <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
        <span className="text-xs text-muted-foreground">
          {days !== null && days >= 0 && days <= 14 ? (
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {days === 0 ? "Closes today" : `Closes in ${days} day${days === 1 ? "" : "s"}`}
            </span>
          ) : (
            `Posted ${timeAgo(job.created_at)}`
          )}
        </span>
        <div className="relative z-10 flex items-center gap-2">
          {tracked ? (
            <Link href={`/applications/${application.id}`} className="inline-flex items-center gap-1 text-xs">
              <StatusPill status={application.status} />
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            </Link>
          ) : (
            <SaveJobButton jobId={job.id} initialSaved={saved} compact />
          )}
        </div>
      </div>
    </article>
  );
}
