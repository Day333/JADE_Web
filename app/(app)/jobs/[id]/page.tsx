import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  Globe,
  Lightbulb,
  Mail,
  Send,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { ForYouLabel, MatchBadge, ReadinessRing, SkillChip } from "@/components/app/match";
import { EmptyState } from "@/components/app/page-parts";
import { InvitationActions } from "@/components/jobs/invitation-actions";
import { CompanyMark, JobMeta, SampleTag, StatusPill } from "@/components/jobs/job-parts";
import { matchCaveats, recommendedBeforeApplying, whyYouMatch } from "@/components/jobs/match-insights";
import { RecruiterChatButton } from "@/components/jobs/recruiter-chat-button";
import { SaveJobButton } from "@/components/jobs/save-job-button";
import { Button } from "@/components/ui/button";
import { LEVEL_LABELS, matchJob, skillLevels } from "@/lib/ai/matching";
import { requireProfile } from "@/lib/auth";
import { getCatalog, skillName } from "@/lib/data/catalog";
import { loadJob, loadOpenJobs, rankJobs } from "@/lib/data/jobs";
import { loadCareerProfile } from "@/lib/data/profile";
import { formatDate, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Params = Promise<{ id: string }>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: "Job" };
  const job = await loadJob(id);
  return { title: job ? `${job.title} · ${job.company?.name ?? "Job"}` : "Job" };
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-3", className)}>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function JobDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const profile = await requireProfile({ role: "seeker" });
  const supabase = await createClient();

  const [job, catalog, data, appResult, invitesResult] = await Promise.all([
    UUID.test(id) ? loadJob(id) : Promise.resolve(null),
    getCatalog(),
    loadCareerProfile(profile.id),
    UUID.test(id)
      ? supabase.from("applications").select("id, status, submitted_at").eq("job_id", id).eq("user_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
    UUID.test(id)
      ? supabase
          .from("invitations")
          .select("id, kind, message, created_at")
          .eq("job_id", id)
          .eq("candidate_id", profile.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  if (!data) redirect("/onboarding");
  const application = appResult.data;

  if (!job) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <EmptyState
          icon={Building2}
          title="This listing is no longer available"
          description="The employer may have closed or removed it. Your saved jobs and applications are still in your tracker."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/jobs">Browse open jobs</Link>
              </Button>
              {application && (
                <Button asChild variant="outline">
                  <Link href={`/applications/${application.id}`}>View your application</Link>
                </Button>
              )}
            </div>
          }
        />
      </div>
    );
  }

  const [companyResult, communityResult, openJobs] = await Promise.all([
    supabase.from("companies").select("*").eq("id", job.company_id).maybeSingle(),
    supabase.from("communities").select("slug, name").eq("company_id", job.company_id).limit(1).maybeSingle(),
    loadOpenJobs(),
  ]);
  const company = companyResult.data;
  const community = communityResult.data;
  const companyName = company?.name ?? job.company?.name ?? "Company";

  const levels = skillLevels(data);
  const match = matchJob(data, catalog, job);
  const reasons = whyYouMatch(data, catalog, job, match);
  const caveats = matchCaveats(data, job);
  const advice = recommendedBeforeApplying(data, catalog, job, match);
  const career = job.career_id ? catalog.careerById.get(job.career_id) : null;
  const invitations = invitesResult.data ?? [];
  const submitted = application && application.status !== "saved" && application.status !== "withdrawn";
  const similar = rankJobs(
    data,
    catalog,
    openJobs.filter((j) => j.id !== job.id && (j.career_id === job.career_id || j.company_id === job.company_id)),
  ).slice(0, 3);
  const haveSkills = match.strengths.filter((sid) => !match.gaps.some((g) => g.skillId === sid));
  const allSkills = [
    ...job.required_skills.map((sid) => ({ id: sid, required: true })),
    ...job.preferred_skills.map((sid) => ({ id: sid, required: false })),
  ];

  return (
    <div className="space-y-6">
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        All opportunities
      </Link>

      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="flex flex-col gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-violet-500/15 p-2 text-violet-700 dark:text-violet-300">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">
                {companyName} invited you to {inv.kind === "interview" ? "interview" : "apply"}
              </p>
              <p className="text-sm text-muted-foreground">
                {inv.message ? `“${inv.message}”` : `Sent ${timeAgo(inv.created_at)}. The recruiter thinks your profile fits this role.`}
              </p>
            </div>
          </div>
          <InvitationActions invitationId={inv.id} kind={inv.kind} />
        </div>
      ))}

      <header className="rounded-2xl border bg-card p-5 sm:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <CompanyMark name={companyName} className="h-14 w-14 text-base" />
            <div className="min-w-0 space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{job.title}</h1>
              <p className="flex flex-wrap items-center gap-2 text-muted-foreground">
                {community ? (
                  <Link href={`/community/c/${community.slug}`} className="font-medium text-foreground hover:underline">
                    {companyName}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{companyName}</span>
                )}
                {company?.is_sample && <SampleTag />}
                {job.industry && <span className="text-sm">· {job.industry}</span>}
              </p>
              <JobMeta job={job} showSalary showDeadline showGradYears className="pt-1" />
              <p className="text-xs text-muted-foreground">Posted {timeAgo(job.created_at)}</p>
            </div>
          </div>
          <MatchBadge score={match.score} label="Your match" className="self-start px-3 py-1 text-sm" />
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t pt-5 sm:flex-row sm:flex-wrap sm:items-center [&>*]:w-full sm:[&>*]:w-auto [&_button]:w-full sm:[&_button]:w-auto">
          {submitted ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">
                You applied{application.submitted_at ? ` on ${formatDate(application.submitted_at)}` : ""}:
              </span>
              <StatusPill status={application.status} />
              <Button asChild variant="outline">
                <Link href={`/applications/${application.id}`}>
                  Track application
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          ) : (
            <Button asChild size="lg" className="px-6">
              <Link href={`/jobs/${job.id}/apply`}>
                <Send />
                {application?.status === "withdrawn" ? "Apply Again" : "Apply Now"}
              </Link>
            </Button>
          )}
          <RecruiterChatButton recruiterId={job.posted_by} jobId={job.id} />
          {!submitted && application?.status !== "withdrawn" && (
            <SaveJobButton jobId={job.id} initialSaved={application?.status === "saved"} size="default" />
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="order-2 space-y-8 rounded-2xl border bg-card p-5 sm:p-7 lg:order-1">
          {job.description && (
            <Section title="Job Description">
              <p className="whitespace-pre-line text-sm leading-relaxed">{job.description}</p>
              {(job.description_is_excerpt || job.source_url?.startsWith("https://")) && (
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
                  {job.description_is_excerpt && (
                    <span className="text-muted-foreground">This is an excerpt of the original job ad.</span>
                  )}
                  {job.source_url?.startsWith("https://") && (
                    <a
                      href={job.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      View original posting <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  )}
                </div>
              )}
            </Section>
          )}
          {job.responsibilities.length > 0 && (
            <Section title="Responsibilities">
              <BulletList items={job.responsibilities} />
            </Section>
          )}
          {(job.requirements.length > 0 || job.experience_level || job.education_requirement) && (
            <Section title="Requirements">
              {job.requirements.length > 0 && <BulletList items={job.requirements} />}
              {(job.experience_level || job.education_requirement) && (
                <dl className="grid gap-3 pt-1 text-sm sm:grid-cols-2">
                  {job.experience_level && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-xs text-muted-foreground">Experience</dt>
                      <dd className="font-medium">{job.experience_level}</dd>
                    </div>
                  )}
                  {job.education_requirement && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <dt className="text-xs text-muted-foreground">Education</dt>
                      <dd className="font-medium">{job.education_requirement}</dd>
                    </div>
                  )}
                </dl>
              )}
            </Section>
          )}
          {job.preferred_qualifications.length > 0 && (
            <Section title="Preferred Qualifications">
              <BulletList items={job.preferred_qualifications} />
            </Section>
          )}
          {allSkills.length > 0 && (
            <Section title="Skills for this role">
              <p className="text-sm text-muted-foreground">Compared with the skills on your Career Profile.</p>
              <div className="flex flex-wrap gap-2">
                {allSkills.map(({ id: sid, required }) => {
                  const level = levels.get(sid) ?? 0;
                  return (
                    <SkillChip
                      key={sid}
                      name={`${skillName(catalog, sid)}${required ? "" : " (preferred)"}`}
                      status={level >= 2 ? "have" : level === 1 ? "improving" : "gap"}
                    />
                  );
                })}
              </div>
            </Section>
          )}
          {company && (
            <Section title={`About ${company.name}`} className="border-t pt-6">
              {company.description && <p className="text-sm leading-relaxed text-muted-foreground">{company.description}</p>}
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {company.industry && (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    {company.industry}
                  </span>
                )}
                {company.size && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {company.size} employees
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {community && (
                  <Link href={`/community/c/${community.slug}`} className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline dark:text-emerald-400">
                    <Users className="h-4 w-4" />
                    Read what people say in the {community.name} community
                  </Link>
                )}
              </div>
            </Section>
          )}
        </div>

        <aside className="order-1 space-y-4 lg:order-2">
          <div className="space-y-5 rounded-2xl border bg-card p-5 lg:sticky lg:top-20">
            <div className="flex items-center gap-4">
              <ReadinessRing value={match.score} label="Match" size={104} />
              <div className="space-y-1">
                <ForYouLabel>Your Match</ForYouLabel>
                <p
                  className={cn(
                    "text-sm font-medium",
                    match.verdict === "ready"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : match.verdict === "good"
                        ? "text-teal-700 dark:text-teal-300"
                        : "text-muted-foreground",
                  )}
                >
                  {match.message}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Why You Match
              </h3>
              <ul className="space-y-1.5">
                {reasons.map((r) => (
                  <li key={r} className="flex gap-2 text-sm">
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <span>{r}</span>
                  </li>
                ))}
                {caveats.map((c) => (
                  <li key={c} className="flex gap-2 text-sm text-muted-foreground">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            {job.required_skills.length + job.preferred_skills.length === 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Skills Match</h3>
                <p className="text-sm text-muted-foreground">
                  This posting doesn&apos;t list specific skills, so your match is based on your preferences and career
                  goal. Read the job ad to judge the skill fit yourself.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Skills You Already Have</h3>
                  {haveSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {haveSkills.map((sid) => (
                        <SkillChip key={sid} name={`${skillName(catalog, sid)} · ${LEVEL_LABELS[levels.get(sid) ?? 1]}`} status="have" />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">None of this role&apos;s listed skills are on your profile yet.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Missing Skills</h3>
                  {match.gaps.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {match.gaps.map((g) => (
                        <SkillChip
                          key={g.skillId}
                          name={`${skillName(catalog, g.skillId)}${g.required ? "" : " (preferred)"}`}
                          status={(levels.get(g.skillId) ?? 0) > 0 ? "improving" : "gap"}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">No gaps. You cover every listed skill.</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-3 border-t pt-4">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Recommended Before Applying
              </h3>
              {advice.length > 0 ? (
                <ul className="space-y-3">
                  {advice.map((a) => (
                    <li key={a.skillId} className="rounded-lg border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {a.improving ? "Strengthen" : "Learn"} {a.name}
                        </p>
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {a.required ? "Required" : "Preferred"}
                        </span>
                      </div>
                      <p className="mt-1 flex gap-1.5 text-xs leading-relaxed text-muted-foreground">
                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                        {a.hint}
                      </p>
                      <Link href={a.href} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                        {a.hrefLabel}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing to close first. Tailor your resume to the responsibilities above and apply.
                </p>
              )}
              {career && (
                <p className="text-xs text-muted-foreground">
                  This role is part of the{" "}
                  <Link href={`/careers/${career.id}`} className="font-medium text-foreground hover:underline">
                    {career.title}
                  </Link>{" "}
                  career path.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="space-y-3 pt-4">
          <h2 className="text-lg font-semibold tracking-tight">Similar opportunities</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {similar.map(({ job: s, match: m }) => (
              <Link
                key={s.id}
                href={`/jobs/${s.id}`}
                className="flex items-start gap-3 rounded-xl border bg-card p-4 transition hover:border-emerald-500/40 hover:shadow-sm"
              >
                <CompanyMark name={s.company?.name} className="h-9 w-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{s.company?.name}</p>
                </div>
                <MatchBadge score={m.score} className="shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
