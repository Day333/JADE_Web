import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Briefcase,
  CircleAlert,
  ExternalLink,
  FileText,
  FolderGit2,
  Github,
  Globe,
  GraduationCap,
  Linkedin,
  Lock,
  MapPin,
  Target,
} from "lucide-react";
import { MatchBadge, ReadinessRing, SkillChip } from "@/components/app/match";
import { MessageButton } from "@/components/app/social-buttons";
import { UserAvatar } from "@/components/app/user-avatar";
import { SaveCandidateButton, ShortlistButton } from "@/components/employer/candidate-buttons";
import { InviteButton } from "@/components/employer/invite-actions";
import { StatusControl } from "@/components/employer/status-control";
import { StatusPill } from "@/components/jobs/job-parts";
import { Button } from "@/components/ui/button";
import { LEVEL_LABELS, matchJob, skillEvidence } from "@/lib/ai/matching";
import { getCatalog, skillName } from "@/lib/data/catalog";
import { loadCareerProfile } from "@/lib/data/profile";
import { APPLICATION_STATUS_LABELS, formatDate, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";
import { UUID, fitLabel, loadCompanyJobs, requireRecruiterWithCompany } from "../../_lib/data";

export const metadata: Metadata = { title: "Candidate Profile" };

const KIND_LABEL: Record<string, string> = {
  internship: "Internship",
  work: "Work",
  research: "Research",
  volunteer: "Volunteer",
  other: "Experience",
};

function Section({
  title,
  icon: Icon,
  children,
  count,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        {title}
        {count !== undefined && <span className="text-sm font-normal text-muted-foreground">({count})</span>}
      </h2>
      {children}
    </section>
  );
}

function dates(start: string | null, end: string | null) {
  if (!start && !end) return null;
  return `${start ?? "?"} – ${end ?? "Present"}`;
}

/** skillEvidence() speaks to the candidate; recruiters read it in the third person. */
function thirdPerson(text: string) {
  return text.replace(/\byour\b/g, "their");
}

export default async function CandidateProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ job?: string }>;
}) {
  const { id } = await params;
  const { job: jobParam } = await searchParams;
  if (!UUID.test(id)) notFound();
  const { profile: me, company } = await requireRecruiterWithCompany();
  const supabase = await createClient();

  const [data, catalog, canViewResult, jobs, savedResult, invitesResult] = await Promise.all([
    loadCareerProfile(id),
    getCatalog(),
    supabase.rpc("can_view_profile", { p_user: id }),
    loadCompanyJobs(company.id),
    supabase.from("saved_candidates").select("candidate_id").eq("recruiter_id", me.id).eq("candidate_id", id).maybeSingle(),
    supabase.from("invitations").select("job_id, kind, status").eq("recruiter_id", me.id).eq("candidate_id", id),
  ]);
  if (!data || data.profile.role !== "seeker") notFound();
  const candidate = data.profile;
  const canView = canViewResult.data === true;

  const job = jobParam && UUID.test(jobParam) ? (jobs.find((j) => j.id === jobParam) ?? null) : null;
  let application: {
    id: string;
    status: ApplicationStatus;
    resume_id: string | null;
    cover_letter: string | null;
    share_profile: boolean;
    share_portfolio: boolean;
    shortlisted: boolean;
    submitted_at: string | null;
  } | null = null;
  let events: { id: string; status: ApplicationStatus; note: string | null; created_at: string }[] = [];
  if (job) {
    const { data: app } = await supabase
      .from("applications")
      .select("id, status, resume_id, cover_letter, share_profile, share_portfolio, shortlisted, submitted_at")
      .eq("job_id", job.id)
      .eq("user_id", id)
      .neq("status", "saved")
      .maybeSingle();
    application = app;
    if (application?.status === "applied") {
      // Opening an application marks it as viewed (the candidate is notified by a trigger).
      const { error } = await supabase.rpc("set_application_status", { p_application: application.id, p_status: "viewed" });
      if (!error) application = { ...application, status: "viewed" };
    }
    if (application) {
      const { data: ev } = await supabase
        .from("application_events")
        .select("id, status, note, created_at")
        .eq("application_id", application.id)
        .order("created_at", { ascending: false });
      events = ev ?? [];
    }
  }

  // Resume: the one attached to the application, otherwise their primary resume if it's visible to us.
  const { data: resumes } = application?.resume_id
    ? await supabase.from("resumes").select("id, file_name, created_at").eq("id", application.resume_id)
    : await supabase
        .from("resumes")
        .select("id, file_name, created_at")
        .eq("user_id", id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);
  const resume = resumes?.[0] ?? null;

  const openAnyway = candidate.profile_public || candidate.open_to_opportunities;
  const detailsHidden = !canView || (application && !application.share_profile && !openAnyway);
  const portfolioHidden = detailsHidden || (application && !application.share_portfolio && !openAnyway);
  const invitations = invitesResult.data ?? [];
  const invited = (kind: "apply" | "interview") =>
    Boolean(job && invitations.some((i) => i.job_id === job.id && i.kind === kind && i.status === "pending"));

  const match = job && !detailsHidden ? matchJob(data, catalog, job) : null;
  const jobSkills = new Set(job ? [...job.required_skills, ...job.preferred_skills] : []);
  const skills = [...data.skills].sort(
    (a, b) => Number(jobSkills.has(b.skill_id)) - Number(jobSkills.has(a.skill_id)) || b.level - a.level,
  );
  const openJobs = jobs.filter((j) => j.status === "open");
  const jobMatches = !job && !detailsHidden ? openJobs.map((j) => ({ job: j, match: matchJob(data, catalog, j) })).sort((a, b) => b.match.score - a.match.score) : [];
  const goalCareer = data.goal ? catalog.careerById.get(data.goal.career_id) : null;
  const education = data.educations[0];
  const links = portfolioHidden
    ? []
    : [
        candidate.github_url && { href: candidate.github_url, label: "GitHub", icon: Github },
        candidate.linkedin_url && { href: candidate.linkedin_url, label: "LinkedIn", icon: Linkedin },
        candidate.website_url && { href: candidate.website_url, label: "Website", icon: Globe },
      ].filter((l): l is { href: string; label: string; icon: typeof Github } => Boolean(l));

  const portfolioLinks: { title: string; url: string; description?: string | null }[] = [
    ...data.portfolio.map((p) => ({ title: p.title, url: p.url, description: p.description })),
    ...links.map((l) => ({ title: l.label, url: l.href })),
    ...data.projects.filter((p) => p.url).map((p) => ({ title: `Project: ${p.name}`, url: p.url! })),
  ];

  return (
    <div className="space-y-6">
      <Link
        href={job ? `/employer/jobs/${job.id}/candidates` : "/employer/discover"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {job ? `Candidates for ${job.title}` : "Discover Talent"}
      </Link>

      <header className="rounded-2xl border bg-card p-5 sm:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <UserAvatar name={candidate.full_name} seed={candidate.id} size="xl" className="hidden md:inline-flex" />
          <UserAvatar name={candidate.full_name} seed={candidate.id} size="lg" className="md:hidden" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{candidate.full_name}</h1>
              {candidate.open_to_opportunities && (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Open to opportunities
                </span>
              )}
            </div>
            {candidate.headline && <p className="text-muted-foreground">{candidate.headline}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {(education || candidate.university) && (
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" />
                  {[education?.degree ?? candidate.degree, education?.school ?? candidate.university].filter(Boolean).join(", ")}
                  {candidate.graduation_year ? ` · Class of ${candidate.graduation_year}` : ""}
                </span>
              )}
              {candidate.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {candidate.location}
                </span>
              )}
              {goalCareer && !detailsHidden && (
                <span className="inline-flex items-center gap-1.5">
                  <Target className="h-4 w-4" />
                  Goal: {goalCareer.title}
                </span>
              )}
            </div>
            {links.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {links.map(({ href, label, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-accent"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
            <MessageButton userId={candidate.id} jobId={job?.id} size="default" />
            <SaveCandidateButton candidateId={candidate.id} initialSaved={Boolean(savedResult.data)} size="default" />
            {resume ? (
              <Button asChild variant="outline">
                <a href={`/resume/${resume.id}`} target="_blank" rel="noopener noreferrer">
                  <FileText />
                  Resume
                </a>
              </Button>
            ) : (
              <span className="self-center text-xs text-muted-foreground">No resume visible</span>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="order-2 space-y-6 lg:order-1">
          {detailsHidden ? (
            <div className="flex items-start gap-3 rounded-2xl border border-dashed p-6">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">Career Profile not shared</p>
                <p className="text-sm text-muted-foreground">
                  {!canView
                    ? "This candidate keeps their detailed profile private and isn't open to opportunities. You can see their details once they apply to one of your jobs."
                    : "The candidate chose not to share their Career Profile with this application. Review their resume and cover letter instead."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <Section title="Skills & Evidence" icon={Award} count={skills.length}>
                {skills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No skills on this profile yet.</p>
                ) : (
                  <ul className="divide-y">
                    {skills.map((s) => {
                      const evidence = skillEvidence(data, catalog, s.skill_id).map(thirdPerson);
                      const relevant = jobSkills.has(s.skill_id);
                      return (
                        <li key={s.skill_id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4">
                          <div className="flex w-56 shrink-0 items-center gap-2">
                            <SkillChip name={skillName(catalog, s.skill_id)} status={relevant ? "have" : "neutral"} />
                            <span className="text-xs text-muted-foreground">{LEVEL_LABELS[s.level]}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Used in: </span>
                            {evidence.length > 0 ? evidence.join(" · ") : "No evidence recorded yet"}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Section>

              <Section title="Experience" icon={Briefcase} count={data.experiences.length}>
                {data.experiences.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No experience listed.</p>
                ) : (
                  <ol className="space-y-5">
                    {data.experiences.map((e) => (
                      <li key={e.id} className="relative border-l-2 border-emerald-500/30 pl-4">
                        <p className="font-medium">
                          {e.title}
                          {e.organization && <span className="font-normal text-muted-foreground"> · {e.organization}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {KIND_LABEL[e.kind] ?? "Experience"}
                          {dates(e.start_date, e.end_date) ? ` · ${dates(e.start_date, e.end_date)}` : ""}
                        </p>
                        {e.description && <p className="mt-1.5 whitespace-pre-line text-sm">{e.description}</p>}
                        {e.skills.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {e.skills.map((sid) => (
                              <SkillChip key={sid} name={skillName(catalog, sid)} status={jobSkills.has(sid) ? "have" : "neutral"} />
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </Section>

              <Section title="Projects" icon={FolderGit2} count={data.projects.length}>
                {data.projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No projects listed.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {data.projects.map((p) => (
                      <div key={p.id} className="rounded-xl border p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{p.name}</p>
                          {p.url && !portfolioHidden && (
                            <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" aria-label={`Open ${p.name}`}>
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        {p.role && <p className="text-xs text-muted-foreground">{p.role}</p>}
                        {p.description && <p className="mt-1.5 line-clamp-4 text-sm text-muted-foreground">{p.description}</p>}
                        {p.skills.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {p.skills.map((sid) => (
                              <SkillChip key={sid} name={skillName(catalog, sid)} status={jobSkills.has(sid) ? "have" : "neutral"} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Education" icon={GraduationCap} count={data.educations.length}>
                {data.educations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No education listed.</p>
                ) : (
                  <ul className="space-y-4">
                    {data.educations.map((ed) => (
                      <li key={ed.id}>
                        <p className="font-medium">{ed.school}</p>
                        <p className="text-sm text-muted-foreground">
                          {[ed.degree, ed.field].filter(Boolean).join(", ")}
                          {dates(ed.start_date, ed.end_date) ? ` · ${dates(ed.start_date, ed.end_date)}` : ""}
                        </p>
                        {ed.courses.length > 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            <BookOpen className="mr-1 inline h-3.5 w-3.5" />
                            {ed.courses.join(" · ")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {data.certifications.length > 0 && (
                <Section title="Certifications" icon={Award} count={data.certifications.length}>
                  <ul className="space-y-2 text-sm">
                    {data.certifications.map((c) => (
                      <li key={c.id}>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted-foreground">{[c.issuer, c.year].filter(Boolean).map((v) => ` · ${v}`).join("")}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <Section title="Portfolio" icon={Globe} count={portfolioHidden ? undefined : portfolioLinks.length}>
                {portfolioHidden ? (
                  <p className="text-sm text-muted-foreground">The candidate chose not to share their portfolio with this application.</p>
                ) : portfolioLinks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No portfolio links yet.</p>
                ) : (
                  <ul className="divide-y rounded-xl border">
                    {portfolioLinks.map((p) => (
                      <li key={`${p.title}-${p.url}`} className="flex items-center gap-3 p-3 text-sm">
                        <FolderGit2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{p.title}</span>
                          {p.description && <span className="block truncate text-xs text-muted-foreground">{p.description}</span>}
                        </span>
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline dark:text-emerald-400">
                          Open
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )}
        </div>

        <aside className="order-1 space-y-4 lg:order-2">
          {job ? (
            <>
              <section className="space-y-4 rounded-2xl border bg-card p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Match for</p>
                  <p className="font-semibold">{job.title}</p>
                </div>
                {match ? (
                  <>
                    <div className="flex items-center gap-4">
                      <ReadinessRing value={match.score} label="Match" size={96} />
                      <div>
                        <p className="font-medium">{fitLabel(match)}</p>
                        <p className="text-sm text-muted-foreground">
                          Has {match.strengths.length} of {job.required_skills.length + job.preferred_skills.length} listed skills
                        </p>
                      </div>
                    </div>
                    {match.strengths.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Meets</p>
                        <div className="flex flex-wrap gap-1.5">
                          {match.strengths
                            .filter((sid) => !match.gaps.some((g) => g.skillId === sid))
                            .map((sid) => (
                              <SkillChip key={sid} name={skillName(catalog, sid)} status="have" />
                            ))}
                        </div>
                      </div>
                    )}
                    {match.gaps.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Gaps</p>
                        <div className="flex flex-wrap gap-1.5">
                          {match.gaps.map((g) => (
                            <SkillChip
                              key={g.skillId}
                              name={`${skillName(catalog, g.skillId)}${g.required ? "" : " (preferred)"}`}
                              status={data.skills.some((s) => s.skill_id === g.skillId) ? "improving" : "gap"}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">A match score needs access to the candidate&apos;s skills.</p>
                )}
                {jobs.length > 1 && (
                  <Link href={`/employer/candidates/${candidate.id}`} className="block text-xs text-muted-foreground hover:text-foreground hover:underline">
                    Compare with your other jobs
                  </Link>
                )}
              </section>

              {application ? (
                <section className="space-y-4 rounded-2xl border bg-card p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold">Application</h2>
                    <div className="flex items-center gap-1">
                      <StatusPill status={application.status} />
                      <ShortlistButton applicationId={application.id} initial={application.shortlisted} />
                    </div>
                  </div>
                  {application.submitted_at && (
                    <p className="text-xs text-muted-foreground">Applied {formatDate(application.submitted_at)}</p>
                  )}
                  <StatusControl applicationId={application.id} current={application.status} />
                  {application.status !== "interview" && application.status !== "offer" && !["rejected", "withdrawn"].includes(application.status) && (
                    <InviteButton candidateId={candidate.id} jobId={job.id} kind="interview" initiallyInvited={invited("interview")} className="w-full" />
                  )}
                  <div className="space-y-1.5 border-t pt-4">
                    <h3 className="text-sm font-medium">Cover letter</h3>
                    {application.cover_letter ? (
                      <p className="max-h-64 overflow-auto whitespace-pre-line rounded-lg bg-muted/40 p-3 text-sm">{application.cover_letter}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No cover letter.</p>
                    )}
                  </div>
                  {events.length > 0 && (
                    <div className="space-y-2 border-t pt-4">
                      <h3 className="text-sm font-medium">Timeline</h3>
                      <ol className="space-y-2">
                        {events.map((e) => (
                          <li key={e.id} className="text-sm">
                            <span className="font-medium">{APPLICATION_STATUS_LABELS[e.status]}</span>
                            <span className="text-muted-foreground"> · {timeAgo(e.created_at)}</span>
                            {e.note && <p className="text-xs text-muted-foreground">“{e.note}”</p>}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </section>
              ) : (
                <section className="space-y-3 rounded-2xl border bg-card p-5">
                  <h2 className="font-semibold">Hasn&apos;t applied yet</h2>
                  <p className="text-sm text-muted-foreground">
                    Invite {candidate.full_name?.split(" ")[0] ?? "them"} and they&apos;ll get a notification with a link to this job.
                  </p>
                  {!candidate.allow_recruiter_contact || !candidate.open_to_opportunities ? (
                    <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      This candidate isn&apos;t accepting invitations from recruiters right now.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2 [&_button]:w-full">
                      <InviteButton candidateId={candidate.id} jobId={job.id} kind="apply" variant="default" initiallyInvited={invited("apply")} />
                      <InviteButton candidateId={candidate.id} jobId={job.id} kind="interview" initiallyInvited={invited("interview")} />
                    </div>
                  )}
                </section>
              )}
            </>
          ) : (
            <section className="space-y-3 rounded-2xl border bg-card p-5">
              <h2 className="font-semibold">Evaluate against your jobs</h2>
              {openJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  <Link href="/employer/jobs/new" className="font-medium text-foreground hover:underline">
                    Post a job
                  </Link>{" "}
                  to see how this candidate matches it.
                </p>
              ) : detailsHidden ? (
                <p className="text-sm text-muted-foreground">Match scores need access to the candidate&apos;s skills.</p>
              ) : (
                <ul className="space-y-2">
                  {jobMatches.map(({ job: j, match: m }) => (
                    <li key={j.id}>
                      <Link
                        prefetch={false}
                        href={`/employer/candidates/${candidate.id}?job=${j.id}`}
                        className={cn("flex items-center justify-between gap-2 rounded-lg border p-3 text-sm transition hover:bg-accent/50")}
                      >
                        <span className="min-w-0 truncate font-medium">{j.title}</span>
                        <MatchBadge score={m.score} className="shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">Pick a job to see the match breakdown and send invitations.</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
