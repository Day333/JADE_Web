import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  FileText,
  Mail,
  PartyPopper,
  Send,
  Target,
} from "lucide-react";
import { MatchBadge } from "@/components/app/match";
import { PageHeader } from "@/components/app/page-parts";
import { InvitationActions } from "@/components/jobs/invitation-actions";
import { CompanyMark, JobMeta, SampleTag, StatusPill } from "@/components/jobs/job-parts";
import { RecruiterChatButton } from "@/components/jobs/recruiter-chat-button";
import { StatusProgress } from "@/components/jobs/status-progress";
import { WithdrawButton } from "@/components/jobs/withdraw-button";
import { Button } from "@/components/ui/button";
import { matchJob } from "@/lib/ai/matching";
import { requireProfile } from "@/lib/auth";
import { getCatalog } from "@/lib/data/catalog";
import { loadCareerProfile } from "@/lib/data/profile";
import { APPLICATION_STATUS_LABELS, formatDate, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Application" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NEXT_STEP: Partial<Record<ApplicationStatus, string>> = {
  applied: "Your application is with the employer. You'll get a notification when they open it.",
  viewed: "The recruiter has opened your application. Shortlisting usually follows within a week or two.",
  screening: "You're being screened. Make sure your profile and portfolio links are up to date.",
  interview: "You're in the interview stage. Message the recruiter if you need to arrange a time.",
  offer: "Congratulations on the offer! Chat with the recruiter about next steps.",
  rejected: "This one didn't work out. Your match insights on similar jobs show what to strengthen next.",
  withdrawn: "You withdrew this application. You can apply again while the job is open.",
};

const DOT: Record<ApplicationStatus, string> = {
  saved: "bg-muted-foreground",
  applied: "bg-amber-500",
  viewed: "bg-sky-500",
  screening: "bg-sky-500",
  interview: "bg-violet-500",
  offer: "bg-emerald-500",
  rejected: "bg-muted-foreground",
  withdrawn: "bg-muted-foreground",
};

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { id } = await params;
  const { submitted } = await searchParams;
  if (!UUID.test(id)) notFound();
  const profile = await requireProfile({ role: "seeker" });
  const supabase = await createClient();

  const { data: app } = await supabase
    .from("applications")
    .select(
      "*, job:jobs(id, title, location, job_type, salary_range, deadline, grad_years, required_skills, preferred_skills, career_id, posted_by, status, company:companies(name, slug, is_sample))",
    )
    .eq("id", id)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!app) notFound();

  const [eventsResult, resumeResult, invitesResult, catalog, data] = await Promise.all([
    supabase.from("application_events").select("id, status, note, actor_id, created_at").eq("application_id", id).order("created_at"),
    app.resume_id
      ? supabase.from("resumes").select("id, file_name, created_at").eq("id", app.resume_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("invitations")
      .select("id, kind, message, created_at")
      .eq("job_id", app.job_id)
      .eq("candidate_id", profile.id)
      .eq("status", "pending"),
    getCatalog(),
    loadCareerProfile(profile.id),
  ]);
  const events = eventsResult.data ?? [];
  const resume = resumeResult.data;
  const job = app.job;
  const companyName = job?.company?.name ?? "The company";
  const match = job && data ? matchJob(data, catalog, job) : null;
  const justSubmitted = submitted === "1" && app.status === "applied";
  const canWithdraw = !["saved", "withdrawn", "rejected"].includes(app.status);
  const invitations = invitesResult.data ?? [];

  return (
    <div className="space-y-6">
      <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Application Tracker
      </Link>

      {justSubmitted && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-cyan-500/10 p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/25 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <div className="flex-1 space-y-1">
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                Application Submitted
                <PartyPopper className="h-6 w-6 text-amber-500" aria-hidden />
              </h1>
              <p className="text-muted-foreground">
                Your application for <span className="font-medium text-foreground">{job?.title}</span> at{" "}
                <span className="font-medium text-foreground">{companyName}</span> is on its way. We&apos;ll notify you as
                soon as the recruiter views it.
              </p>
            </div>
          </div>
          <div className="relative mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline" className="bg-background/70">
              <Link href="/jobs">
                Keep exploring jobs
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/skill-gap">
                <Target />
                Keep closing your skill gap
              </Link>
            </Button>
          </div>
        </div>
      )}

      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="flex flex-col gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-2 text-sm">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
            <span>
              <span className="font-semibold">
                {companyName} invited you to {inv.kind === "interview" ? "interview" : "apply"}.
              </span>{" "}
              {inv.message && <span className="text-muted-foreground">“{inv.message}”</span>}
            </span>
          </p>
          <InvitationActions invitationId={inv.id} kind={inv.kind} />
        </div>
      ))}

      {!justSubmitted && (
        <PageHeader
          title={job?.title ?? "Application"}
          description={
            <span className="inline-flex flex-wrap items-center gap-2">
              {companyName}
              {job?.company?.is_sample && <SampleTag />}
            </span>
          }
          actions={<StatusPill status={app.status} className="px-3 py-1 text-sm" />}
          className="mb-0"
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {app.status === "saved" ? (
            <div className="rounded-2xl border bg-card p-6">
              <h2 className="font-semibold">You saved this job</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You haven&apos;t applied yet. Review your application when you&apos;re ready. Nothing is sent until you submit.
              </p>
              {job && (
                <Button asChild className="mt-4">
                  <Link href={`/jobs/${job.id}/apply`}>
                    <Send />
                    Review & apply
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <section className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
              <h2 className="font-semibold">Progress</h2>
              <StatusProgress status={app.status} reached={events.map((e) => e.status)} />
              {NEXT_STEP[app.status] && (
                <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{NEXT_STEP[app.status]}</p>
              )}
            </section>
          )}

          <section className="rounded-2xl border bg-card p-5 sm:p-6">
            <h2 className="mb-4 font-semibold">Timeline</h2>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No updates yet.</p>
            ) : (
              <ol className="relative space-y-6 border-l pl-6">
                {[...events].reverse().map((e, i) => (
                  <li key={e.id} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full ring-4 ring-card",
                        DOT[e.status],
                        i === 0 && "h-4 w-4 -left-[32px]",
                      )}
                      aria-hidden
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={e.status} />
                      <span className="text-xs text-muted-foreground">
                        <time dateTime={e.created_at}>{formatDate(e.created_at, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</time>
                        {" · "}
                        {e.actor_id === profile.id ? "You" : e.actor_id ? companyName : "System"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">
                      {e.status === "saved"
                        ? "Saved to your tracker."
                        : e.status === "applied"
                          ? "Application submitted."
                          : e.status === "viewed"
                            ? "The recruiter viewed your application."
                            : e.status === "withdrawn"
                              ? "You withdrew your application."
                              : `Moved to ${APPLICATION_STATUS_LABELS[e.status]}.`}
                    </p>
                    {e.note && <p className="mt-1 rounded-lg bg-muted/50 p-2 text-sm text-muted-foreground">“{e.note}”</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {app.status !== "saved" && (
            <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
              <h2 className="font-semibold">What you sent</h2>
              <div className="flex items-center gap-3 rounded-xl border p-3">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                {resume ? (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{resume.file_name}</span>
                      <span className="text-xs text-muted-foreground">Uploaded {formatDate(resume.created_at)}</span>
                    </span>
                    <a href={`/resume/${resume.id}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                      Open
                    </a>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">No resume attached</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={cn("rounded-full px-2.5 py-1", app.share_profile ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                  Career Profile {app.share_profile ? "shared" : "not shared"}
                </span>
                <span className={cn("rounded-full px-2.5 py-1", app.share_portfolio ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                  Portfolio {app.share_portfolio ? "shared" : "not shared"}
                </span>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-medium">Cover letter</h3>
                {app.cover_letter ? (
                  <p className="whitespace-pre-line rounded-lg bg-muted/40 p-3 text-sm leading-relaxed">{app.cover_letter}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No cover letter.</p>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="space-y-4 rounded-2xl border bg-card p-5 lg:sticky lg:top-20">
            {job ? (
              <>
                <div className="flex items-start gap-3">
                  <CompanyMark name={job.company?.name} />
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug">{job.title}</p>
                    <p className="text-sm text-muted-foreground">{job.company?.name}</p>
                  </div>
                </div>
                <JobMeta job={job} showSalary showDeadline />
                {match && (
                  <div className="space-y-1 rounded-xl bg-muted/40 p-3">
                    <MatchBadge score={match.score} label="Your match" />
                    <p className="text-sm text-muted-foreground">{match.message}</p>
                  </div>
                )}
                <dl className="space-y-1 text-sm">
                  {app.submitted_at && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Applied</dt>
                      <dd>{formatDate(app.submitted_at)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Last update</dt>
                    <dd>{timeAgo(app.updated_at)}</dd>
                  </div>
                </dl>
                <div className="flex flex-col gap-2 border-t pt-4 [&>*]:w-full [&_button]:w-full">
                  <RecruiterChatButton recruiterId={job.posted_by} jobId={job.id} />
                  <Button asChild variant="outline">
                    <Link href={`/jobs/${job.id}`}>
                      <Eye />
                      View job
                    </Link>
                  </Button>
                  {app.status === "withdrawn" && job.status === "open" && (
                    <Button asChild>
                      <Link href={`/jobs/${job.id}/apply`}>
                        <Send />
                        Apply again
                      </Link>
                    </Button>
                  )}
                  {canWithdraw && <WithdrawButton applicationId={app.id} jobTitle={job.title} companyName={companyName} />}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                This listing has been closed by the employer, so its details are no longer available.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
