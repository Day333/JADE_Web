import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Inbox,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { ForYouLabel, MatchBadge, SkillChip } from "@/components/app/match";
import { EmptyState, PageHeader } from "@/components/app/page-parts";
import { UserAvatar } from "@/components/app/user-avatar";
import { CompanyMark, StatusPill } from "@/components/jobs/job-parts";
import { Button } from "@/components/ui/button";
import { matchJob, type JobMatch } from "@/lib/ai/matching";
import { getCatalog, skillName } from "@/lib/data/catalog";
import { JOB_TYPE_LABELS, formatDate, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Job } from "@/lib/types";
import {
  fitLabel,
  loadCandidateProfiles,
  loadCompanyJobs,
  loadOpenCandidateIds,
  requireRecruiterWithCompany,
  unreadConversationCount,
} from "./_lib/data";

export const metadata: Metadata = { title: "Employer Dashboard" };

const FLASH: Record<string, string> = {
  "company:created": "Your company is set up. Post your first job to start matching candidates.",
  "company:saved": "Company profile saved.",
  "job:deleted": "The job was deleted.",
};

function Panel({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card", className)}>
      <div className="flex items-center justify-between gap-2 border-b px-5 py-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          {title}
        </h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default async function EmployerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; job?: string }>;
}) {
  const { profile, company } = await requireRecruiterWithCompany();
  const sp = await searchParams;
  const flash = (sp.company && FLASH[`company:${sp.company}`]) || (sp.job && FLASH[`job:${sp.job}`]);
  const supabase = await createClient();

  const [catalog, jobs, unread, openIds, savedResult] = await Promise.all([
    getCatalog(),
    loadCompanyJobs(company.id),
    unreadConversationCount(profile.id),
    loadOpenCandidateIds(30),
    supabase.from("saved_candidates").select("candidate_id", { count: "exact", head: true }).eq("recruiter_id", profile.id),
  ]);
  const jobIds = jobs.map((j) => j.id);
  const { data: appsData } = jobIds.length
    ? await supabase
        .from("applications")
        .select("id, job_id, user_id, status, shortlisted, submitted_at, updated_at")
        .in("job_id", jobIds)
        .neq("status", "saved")
        .order("updated_at", { ascending: false })
    : { data: [] };
  const apps = appsData ?? [];

  const openJobs = jobs.filter((j) => j.status === "open");
  const otherJobs = jobs.filter((j) => j.status !== "open");
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const newApps = apps.filter((a) => a.status === "applied").slice(0, 6);
  const interviewApps = apps.filter((a) => a.status === "interview").slice(0, 6);

  const profiles = await loadCandidateProfiles([...newApps, ...interviewApps].map((a) => a.user_id).concat(openIds));
  const matchFor = (userId: string, job: Job | undefined): JobMatch | null => {
    const data = profiles.get(userId);
    return data && job ? matchJob(data, catalog, job) : null;
  };

  const appliedTo = new Set(apps.map((a) => `${a.user_id}:${a.job_id}`));
  const recommended = openIds
    .map((id) => {
      const data = profiles.get(id);
      if (!data || openJobs.length === 0) return null;
      const best = openJobs
        .filter((j) => !appliedTo.has(`${id}:${j.id}`))
        .map((job) => ({ job, match: matchJob(data, catalog, job) }))
        .sort((a, b) => b.match.score - a.match.score)[0];
      return best ? { data, ...best } : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 5);

  const countFor = (jobId: string) => {
    const list = apps.filter((a) => a.job_id === jobId);
    return {
      total: list.length,
      new: list.filter((a) => a.status === "applied").length,
      interview: list.filter((a) => a.status === "interview").length,
      shortlisted: list.filter((a) => a.shortlisted).length,
    };
  };

  const stats = [
    { label: "Active jobs", value: openJobs.length, icon: Briefcase, href: "#active-jobs" },
    { label: "Applicants", value: apps.length, icon: Users, href: "#active-jobs" },
    { label: "New applications", value: apps.filter((a) => a.status === "applied").length, icon: Inbox, href: "#new-applications" },
    { label: "Interviews", value: apps.filter((a) => a.status === "interview").length, icon: CalendarCheck, href: "#interviews" },
    { label: "Unread messages", value: unread, icon: MessageSquare, href: "/messages" },
  ];
  const firstName = profile.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <CompanyMark name={company.name} className="h-6 w-6 rounded-md text-[10px]" />
            {company.name}
            <Link href="/employer/company" className="text-xs underline-offset-4 hover:text-foreground hover:underline">
              Edit company
            </Link>
          </span>
        }
        title={`Welcome back, ${firstName}`}
        description="Your hiring at a glance: who applied, who fits, and who to talk to next."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/employer/discover">
                <Search />
                Discover talent
              </Link>
            </Button>
            <Button asChild>
              <Link href="/employer/jobs/new">
                <Plus />
                Post a job
              </Link>
            </Button>
          </>
        }
        className="mb-0"
      />

      {flash && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          {flash}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition hover:border-emerald-500/40">
            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-300">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Panel
            title="Active Jobs"
            icon={Briefcase}
            action={
              <Link href="/employer/jobs/new" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                Post a job
              </Link>
            }
          >
            <div id="active-jobs" className="scroll-mt-24">
              {openJobs.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="No open jobs yet"
                  description="Publish a job and JADE will match it with candidates by skills, projects and experience."
                  action={
                    <Button asChild>
                      <Link href="/employer/jobs/new">
                        <Plus />
                        Post your first job
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y">
                  {openJobs.map((job) => {
                    const c = countFor(job.id);
                    return (
                      <li key={job.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <Link href={`/employer/jobs/${job.id}/candidates`} className="font-medium hover:underline">
                            {job.title}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {JOB_TYPE_LABELS[job.job_type]}
                            {job.location ? ` · ${job.location}` : ""} · Posted {timeAgo(job.created_at)}
                            {job.deadline ? ` · Closes ${formatDate(job.deadline)}` : ""}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-muted px-2 py-0.5 tabular-nums">
                              {c.total} applicant{c.total === 1 ? "" : "s"}
                            </span>
                            {c.new > 0 && (
                              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-700 tabular-nums dark:text-amber-300">
                                {c.new} new
                              </span>
                            )}
                            {c.interview > 0 && (
                              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-700 tabular-nums dark:text-violet-300">
                                {c.interview} interviewing
                              </span>
                            )}
                            {c.shortlisted > 0 && (
                              <span className="rounded-full bg-muted px-2 py-0.5 tabular-nums">★ {c.shortlisted} shortlisted</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/employer/jobs/${job.id}`}>
                              <Pencil />
                              Edit
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/employer/discover?job=${job.id}`}>
                              <Search />
                              Find talent
                            </Link>
                          </Button>
                          <Button asChild size="sm">
                            <Link href={`/employer/jobs/${job.id}/candidates`}>
                              Candidates
                              <ArrowRight />
                            </Link>
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {otherJobs.length > 0 && (
                <div className="mt-5 border-t pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Drafts & closed</p>
                  <ul className="space-y-1">
                    {otherJobs.map((job) => (
                      <li key={job.id} className="flex items-center justify-between gap-2 text-sm">
                        <Link href={`/employer/jobs/${job.id}`} className="truncate hover:underline">
                          {job.title}
                        </Link>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">{job.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Panel>

          <Panel title="New Applications" icon={Inbox}>
            <div id="new-applications" className="scroll-mt-24">
              {newApps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No unreviewed applications. New applicants appear here, and you&apos;ll get a notification too.
                </p>
              ) : (
                <ul className="divide-y">
                  {newApps.map((a) => {
                    const data = profiles.get(a.user_id);
                    const job = jobById.get(a.job_id);
                    const match = matchFor(a.user_id, job);
                    return (
                      <li key={a.id}>
                        <Link
                          prefetch={false}
                          href={`/employer/candidates/${a.user_id}?job=${a.job_id}`}
                          className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-accent/50"
                        >
                          <UserAvatar name={data?.profile.full_name} seed={a.user_id} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{data?.profile.full_name ?? "Candidate"}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {job?.title} · {timeAgo(a.submitted_at ?? a.updated_at)}
                            </p>
                          </div>
                          {match && <MatchBadge score={match.score} className="shrink-0" />}
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Panel>

          <Panel title="Interview Candidates" icon={CalendarCheck}>
            <div id="interviews" className="scroll-mt-24">
              {interviewApps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nobody in the interview stage yet. Invite shortlisted applicants from a job&apos;s candidate list.
                </p>
              ) : (
                <ul className="divide-y">
                  {interviewApps.map((a) => {
                    const data = profiles.get(a.user_id);
                    const job = jobById.get(a.job_id);
                    return (
                      <li key={a.id}>
                        <Link
                          prefetch={false}
                          href={`/employer/candidates/${a.user_id}?job=${a.job_id}`}
                          className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-accent/50"
                        >
                          <UserAvatar name={data?.profile.full_name} seed={a.user_id} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{data?.profile.full_name ?? "Candidate"}</p>
                            <p className="truncate text-sm text-muted-foreground">{job?.title}</p>
                          </div>
                          <StatusPill status={a.status} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Link
            href="/messages"
            className="flex items-center gap-4 rounded-2xl border bg-card p-5 transition hover:border-emerald-500/40"
          >
            <span className="relative rounded-xl bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300">
              <MessageSquare className="h-6 w-6" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-bold text-white">
                  {unread}
                </span>
              )}
            </span>
            <div className="flex-1">
              <p className="font-semibold">Unread Messages</p>
              <p className="text-sm text-muted-foreground">
                {unread > 0 ? `${unread} conversation${unread === 1 ? "" : "s"} waiting for you` : "You're all caught up"}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <section className="rounded-2xl border bg-card">
            <div className="space-y-1 border-b px-5 py-4">
              <ForYouLabel>Recommended Candidates</ForYouLabel>
              <p className="text-sm text-muted-foreground">Open-to-opportunity talent ranked against your open jobs.</p>
            </div>
            <div className="p-5">
              {openJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Publish a job to see candidates who match it.</p>
              ) : recommended.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open-to-opportunity candidates to recommend right now.</p>
              ) : (
                <ul className="space-y-4">
                  {recommended.map(({ data, job, match }) => {
                    const strengths = match.strengths.filter((id) => !match.gaps.some((g) => g.skillId === id)).slice(0, 3);
                    return (
                      <li key={data.profile.id}>
                        <Link
                          prefetch={false}
                          href={`/employer/candidates/${data.profile.id}?job=${job.id}`}
                          className="-mx-2 block space-y-2 rounded-lg px-2 py-2 transition hover:bg-accent/50"
                        >
                          <div className="flex items-center gap-3">
                            <UserAvatar name={data.profile.full_name} seed={data.profile.id} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{data.profile.full_name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {[data.profile.degree, data.profile.university].filter(Boolean).join(" · ") || data.profile.headline}
                              </p>
                            </div>
                            <MatchBadge score={match.score} className="shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {fitLabel(match)} for <span className="font-medium text-foreground">{job.title}</span>
                          </p>
                          {strengths.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {strengths.map((id) => (
                                <SkillChip key={id} name={skillName(catalog, id)} status="have" />
                              ))}
                            </div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link href="/employer/discover">
                  <Sparkles />
                  Discover more talent
                  {(savedResult.count ?? 0) > 0 && <span className="text-muted-foreground">· {savedResult.count} saved</span>}
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
