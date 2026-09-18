import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, EyeOff, FileText, GraduationCap, Pencil, Search, Users } from "lucide-react";
import { MatchBadge, SkillChip } from "@/components/app/match";
import { EmptyState } from "@/components/app/page-parts";
import { MessageButton } from "@/components/app/social-buttons";
import { UserAvatar } from "@/components/app/user-avatar";
import { InviteInterviewButton, RejectButton, ShortlistButton } from "@/components/employer/candidate-buttons";
import { JobMeta, StatusPill } from "@/components/jobs/job-parts";
import { LinkTabs } from "@/components/jobs/link-tabs";
import { Button } from "@/components/ui/button";
import { matchJob } from "@/lib/ai/matching";
import { getCatalog, skillName } from "@/lib/data/catalog";
import { APPLICATION_STATUS_LABELS, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";
import { UUID, fitLabel, loadCandidateProfiles, requireRecruiterWithCompany } from "../../../_lib/data";

export const metadata: Metadata = { title: "Candidates" };

const TABS = ["all", "shortlisted", "applied", "viewed", "screening", "interview", "offer", "rejected", "withdrawn"] as const;
type Tab = (typeof TABS)[number];

const FLASH: Record<string, string> = {
  published: "Your job is live. It now appears on Jobs and is being matched to candidates.",
  created: "Job saved. Publish it (status Open) when you're ready for applicants.",
  updated: "Job updated.",
};

export default async function CandidatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const { profile, company } = await requireRecruiterWithCompany();
  const supabase = await createClient();

  const [{ data: job }, { data: appsData }, { data: invitesData }, catalog] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", id).eq("company_id", company.id).maybeSingle(),
    supabase
      .from("applications")
      .select("id, user_id, status, shortlisted, resume_id, share_profile, submitted_at, updated_at, created_at")
      .eq("job_id", id)
      .neq("status", "saved"),
    supabase.from("invitations").select("candidate_id, kind, status").eq("job_id", id).eq("recruiter_id", profile.id),
    getCatalog(),
  ]);
  if (!job) notFound();

  const apps = appsData ?? [];
  const profiles = await loadCandidateProfiles(apps.map((a) => a.user_id));
  const interviewInvited = new Set((invitesData ?? []).filter((i) => i.kind === "interview").map((i) => i.candidate_id));

  const tab: Tab = TABS.includes(sp.status as Tab) ? (sp.status as Tab) : "all";
  const sort = sp.sort === "newest" ? "newest" : "match";
  const flash = Object.keys(FLASH).find((k) => sp[k] === "1");

  const rows = apps
    .map((a) => {
      const data = profiles.get(a.user_id);
      const visible = Boolean(
        data && (a.share_profile || data.profile.profile_public || data.profile.open_to_opportunities),
      );
      return { app: a, data, visible, match: data && visible ? matchJob(data, catalog, job) : null };
    })
    .filter(({ app }) => (tab === "all" ? true : tab === "shortlisted" ? app.shortlisted : app.status === tab))
    .sort((a, b) =>
      sort === "newest"
        ? new Date(b.app.submitted_at ?? b.app.created_at).getTime() - new Date(a.app.submitted_at ?? a.app.created_at).getTime()
        : (b.match?.score ?? -1) - (a.match?.score ?? -1),
    );

  const count = (t: Tab) =>
    t === "all" ? apps.length : t === "shortlisted" ? apps.filter((a) => a.shortlisted).length : apps.filter((a) => a.status === t).length;
  const tabHref = (t: Tab, s = sort) => {
    const params = new URLSearchParams();
    if (t !== "all") params.set("status", t);
    if (s !== "match") params.set("sort", s);
    const q = params.toString();
    return `/employer/jobs/${job.id}/candidates${q ? `?${q}` : ""}`;
  };
  const jobSkills = new Set([...job.required_skills, ...job.preferred_skills]);

  return (
    <div className="space-y-6">
      <Link href="/employer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Employer Dashboard
      </Link>

      {flash && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          {FLASH[flash]}
        </p>
      )}

      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:p-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                job.status === "open" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground",
              )}
            >
              {job.status}
            </span>
            <span className="text-xs text-muted-foreground">Posted {timeAgo(job.created_at)}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {job.title} <span className="text-muted-foreground">·</span>{" "}
            <span className="text-emerald-700 dark:text-emerald-400">
              {apps.length} Applicant{apps.length === 1 ? "" : "s"}
            </span>
          </h1>
          <JobMeta job={job} showDeadline />
          {job.required_skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {job.required_skills.map((sid) => (
                <SkillChip key={sid} name={skillName(catalog, sid)} />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/employer/jobs/${job.id}`}>
              <Pencil />
              Edit job
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/employer/discover?job=${job.id}`}>
              <Search />
              Discover talent
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <LinkTabs
          label="Filter candidates by status"
          tabs={TABS.map((t) => ({
            href: tabHref(t),
            label: t === "all" ? "All" : t === "shortlisted" ? "★ Shortlisted" : t === "applied" ? "New" : APPLICATION_STATUS_LABELS[t as ApplicationStatus],
            count: count(t),
            active: tab === t,
          }))}
        />
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">Sort:</span>
          {(["match", "newest"] as const).map((s) => (
            <Link
              key={s}
              href={tabHref(tab, s)}
              scroll={false}
              className={cn("rounded-md px-2 py-1", sort === s ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground")}
            >
              {s === "match" ? "Best match" : "Newest"}
            </Link>
          ))}
        </div>
      </div>

      {apps.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No applicants yet"
          description={
            job.status === "open"
              ? "Your job is live. Don't wait: find matching open-to-opportunity candidates and invite them to apply."
              : "This job isn't open, so candidates can't apply. Publish it from the edit page."
          }
          action={
            <Button asChild>
              <Link href={job.status === "open" ? `/employer/discover?job=${job.id}` : `/employer/jobs/${job.id}`}>
                {job.status === "open" ? "Discover candidates" : "Edit job"}
              </Link>
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="Nobody in this stage" description="Try another tab." />
      ) : (
        <ul className="space-y-3">
          {rows.map(({ app, data, visible, match }) => {
            const name = data?.profile.full_name ?? "Candidate";
            const skills = visible
              ? [...(data?.skills ?? [])]
                  .sort((a, b) => Number(jobSkills.has(b.skill_id)) - Number(jobSkills.has(a.skill_id)) || b.level - a.level)
                  .slice(0, 6)
              : [];
            const closed = app.status === "rejected" || app.status === "withdrawn";
            return (
              <li key={app.id} className={cn("rounded-2xl border bg-card p-4 sm:p-5", closed && "opacity-75")}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <UserAvatar name={name} seed={app.user_id} size="lg" className="hidden sm:inline-flex" />
                    <UserAvatar name={name} seed={app.user_id} className="sm:hidden" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link prefetch={false} href={`/employer/candidates/${app.user_id}?job=${job.id}`} className="text-lg font-semibold hover:underline">
                          {name}
                        </Link>
                        <StatusPill status={app.status} />
                        {app.shortlisted && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">★ Shortlisted</span>}
                      </div>
                      {(data?.profile.university || data?.profile.degree) && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <GraduationCap className="h-4 w-4 shrink-0" />
                          {[data?.profile.degree, data?.profile.university].filter(Boolean).join(" · ")}
                          {data?.profile.graduation_year ? ` · ${data.profile.graduation_year}` : ""}
                        </p>
                      )}
                      {visible ? (
                        skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {skills.map((s) => (
                              <SkillChip
                                key={s.skill_id}
                                name={skillName(catalog, s.skill_id)}
                                status={jobSkills.has(s.skill_id) ? (s.level >= 2 ? "have" : "improving") : "neutral"}
                              />
                            ))}
                          </div>
                        )
                      ) : (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <EyeOff className="h-4 w-4" />
                          The candidate chose not to share their Career Profile. Review their resume instead.
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">Applied {timeAgo(app.submitted_at ?? app.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Career Match</p>
                    {match ? (
                      <>
                        <MatchBadge score={match.score} label="" className="px-3 py-1 text-base" />
                        <p className="text-xs text-muted-foreground">{fitLabel(match)}</p>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Hidden</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                  <Button asChild size="sm">
                    <Link prefetch={false} href={`/employer/candidates/${app.user_id}?job=${job.id}`}>View Profile</Link>
                  </Button>
                  <MessageButton userId={app.user_id} jobId={job.id} />
                  {app.resume_id ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={`/resume/${app.resume_id}`} target="_blank" rel="noopener noreferrer">
                        <FileText />
                        Resume
                      </a>
                    </Button>
                  ) : (
                    <span className="px-2 text-xs text-muted-foreground">No resume attached</span>
                  )}
                  <ShortlistButton applicationId={app.id} initial={app.shortlisted} withLabel />
                  <div className="ml-auto flex flex-wrap gap-2">
                    {!closed && <RejectButton applicationId={app.id} candidateName={name} />}
                    {!closed && app.status !== "interview" && app.status !== "offer" && (
                      <InviteInterviewButton candidateId={app.user_id} jobId={job.id} disabled={interviewInvited.has(app.user_id)} />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
