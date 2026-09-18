import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Bookmark, Briefcase, GraduationCap, Plus, Search, Target, Users } from "lucide-react";
import { ForYouLabel, MatchBadge, SkillChip } from "@/components/app/match";
import { EmptyState, PageHeader } from "@/components/app/page-parts";
import { MessageButton } from "@/components/app/social-buttons";
import { UserAvatar } from "@/components/app/user-avatar";
import { SaveCandidateButton } from "@/components/employer/candidate-buttons";
import { InviteButton } from "@/components/employer/invite-actions";
import { StatusPill } from "@/components/jobs/job-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { matchJob } from "@/lib/ai/matching";
import { getCatalog, skillName } from "@/lib/data/catalog";
import { JOB_TYPE_LABELS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/lib/types";
import { fitLabel, loadCandidateProfiles, loadCompanyJobs, loadOpenCandidateIds, requireRecruiterWithCompany } from "../_lib/data";

export const metadata: Metadata = { title: "Discover Talent" };

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; q?: string; strong?: string }>;
}) {
  const { profile: me, company } = await requireRecruiterWithCompany();
  const sp = await searchParams;
  const supabase = await createClient();

  const [catalog, jobs, openIds, savedResult] = await Promise.all([
    getCatalog(),
    loadCompanyJobs(company.id),
    loadOpenCandidateIds(60),
    supabase.from("saved_candidates").select("candidate_id, created_at").eq("recruiter_id", me.id).order("created_at", { ascending: false }),
  ]);
  const openJobs = jobs.filter((j) => j.status === "open");
  const job = openJobs.find((j) => j.id === sp.job) ?? openJobs[0] ?? null;

  if (!job) {
    return (
      <div className="space-y-6">
        <PageHeader title="Discover Talent" description="Find open-to-opportunity candidates ranked against your jobs." />
        <EmptyState
          icon={Briefcase}
          title="Publish a job to start discovering talent"
          description="Candidates are ranked by how well their skills, projects and experience match a job you're hiring for."
          action={
            <Button asChild>
              <Link href="/employer/jobs/new">
                <Plus />
                Post a job
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const savedIds = (savedResult.data ?? []).map((s) => s.candidate_id);
  const saved = new Set(savedIds);
  const [profiles, { data: appsData }, { data: invitesData }] = await Promise.all([
    loadCandidateProfiles([...openIds, ...savedIds]),
    supabase.from("applications").select("user_id, status").eq("job_id", job.id).neq("status", "saved"),
    supabase.from("invitations").select("candidate_id, kind, status").eq("job_id", job.id).eq("recruiter_id", me.id),
  ]);
  const applied = new Map<string, ApplicationStatus>((appsData ?? []).map((a) => [a.user_id, a.status]));
  const invitedToApply = new Set((invitesData ?? []).filter((i) => i.kind === "apply").map((i) => i.candidate_id));

  const q = sp.q?.trim().toLowerCase().slice(0, 80) ?? "";
  const strongOnly = sp.strong === "1";
  const rank = (ids: string[]) =>
    ids
      .map((id) => profiles.get(id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d))
      .map((data) => ({ data, match: matchJob(data, catalog, job) }))
      .sort((a, b) => b.match.score - a.match.score);

  const ranked = rank(openIds).filter(({ data, match }) => {
    if (strongOnly && match.score < 70) return false;
    if (!q) return true;
    const haystack = [
      data.profile.full_name,
      data.profile.headline,
      data.profile.university,
      data.profile.degree,
      data.profile.major,
      ...data.skills.map((s) => skillName(catalog, s.skill_id)),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
  const savedRanked = rank(savedIds);
  const jobHref = (id: string) => {
    const params = new URLSearchParams({ job: id });
    if (sp.q) params.set("q", sp.q);
    if (strongOnly) params.set("strong", "1");
    return `/employer/discover?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<ForYouLabel>Talent matched to your jobs</ForYouLabel>}
        title="Discover Talent"
        description="Candidates who are open to opportunities, ranked by how well their skills and experience fit your job. Invite the best fits to apply."
        className="mb-0"
      />

      <section className="space-y-2">
        <p className="text-sm font-medium">Hiring for</p>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-2">
            {openJobs.map((j) => (
              <Link
                key={j.id}
                href={jobHref(j.id)}
                scroll={false}
                aria-current={j.id === job.id ? "true" : undefined}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm transition",
                  j.id === job.id ? "border-emerald-500 bg-emerald-500/10 font-medium" : "bg-card hover:bg-accent/50",
                )}
              >
                {j.title}
                <span className="ml-1 text-xs text-muted-foreground">· {JOB_TYPE_LABELS[j.job_type]}</span>
              </Link>
            ))}
          </div>
        </div>
        {job.required_skills.length > 0 && (
          <p className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            Ranking by:
            {job.required_skills.map((sid) => (
              <SkillChip key={sid} name={skillName(catalog, sid)} />
            ))}
            {job.preferred_skills.map((sid) => (
              <SkillChip key={sid} name={`${skillName(catalog, sid)} (preferred)`} />
            ))}
          </p>
        )}
      </section>

      {savedRanked.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Bookmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Saved candidates
            <span className="text-sm font-normal text-muted-foreground">({savedRanked.length})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {savedRanked.map(({ data, match }) => (
              <Link
                key={data.profile.id}
                href={`/employer/candidates/${data.profile.id}?job=${job.id}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 transition hover:border-emerald-500/40"
              >
                <UserAvatar name={data.profile.full_name} seed={data.profile.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{data.profile.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {applied.has(data.profile.id) ? "Applied" : data.skills.length > 0 ? fitLabel(match) : "Profile private"}
                  </p>
                </div>
                {data.skills.length > 0 && <MatchBadge score={match.score} className="shrink-0" />}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <Form action="/employer/discover" className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
          <input type="hidden" name="job" value={job.id} />
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={sp.q ?? ""} placeholder="Search by name, university, degree or skill" className="pl-8" aria-label="Search candidates" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="strong" value="1" defaultChecked={strongOnly} className="h-4 w-4 accent-emerald-600" />
            Strong matches only (70%+)
          </label>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </Form>

        <p className="text-sm text-muted-foreground">
          {ranked.length} candidate{ranked.length === 1 ? "" : "s"} open to opportunities, best match for{" "}
          <span className="font-medium text-foreground">{job.title}</span> first
        </p>

        {ranked.length === 0 ? (
          <EmptyState
            icon={Users}
            title={q || strongOnly ? "No candidates match this search" : "No open-to-opportunity candidates yet"}
            description={
              q || strongOnly
                ? "Try a broader search or include all match levels."
                : "As job seekers turn on “Open to opportunities”, they appear here ranked against your job."
            }
            action={
              q || strongOnly ? (
                <Button asChild variant="outline">
                  <Link href={`/employer/discover?job=${job.id}`}>Clear search</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="space-y-3">
            {ranked.map(({ data, match }) => {
              const p = data.profile;
              const status = applied.get(p.id);
              const strengths = match.strengths.filter((sid) => !match.gaps.some((g) => g.skillId === sid));
              const goal = data.goal ? catalog.careerById.get(data.goal.career_id) : null;
              return (
                <li key={p.id} className="rounded-2xl border bg-card p-4 sm:p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <UserAvatar name={p.full_name} seed={p.id} size="lg" className="hidden sm:inline-flex" />
                      <UserAvatar name={p.full_name} seed={p.id} className="sm:hidden" />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Link prefetch={false} href={`/employer/candidates/${p.id}?job=${job.id}`} className="text-lg font-semibold hover:underline">
                          {p.full_name}
                        </Link>
                        {p.headline && <p className="text-sm text-muted-foreground">{p.headline}</p>}
                        {(p.university || p.degree) && (
                          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <GraduationCap className="h-4 w-4 shrink-0" />
                            {[p.degree, p.university].filter(Boolean).join(" · ")}
                            {p.graduation_year ? ` · ${p.graduation_year}` : ""}
                          </p>
                        )}
                        {goal && <p className="text-xs text-muted-foreground">Career goal: {goal.title}</p>}
                        <div className="grid gap-2 pt-1 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-xs font-medium text-muted-foreground">Strengths for this job</p>
                            <div className="flex flex-wrap gap-1">
                              {strengths.length > 0 ? (
                                strengths.slice(0, 5).map((sid) => <SkillChip key={sid} name={skillName(catalog, sid)} status="have" />)
                              ) : (
                                <span className="text-xs text-muted-foreground">None of the listed skills yet</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-medium text-muted-foreground">Gaps</p>
                            <div className="flex flex-wrap gap-1">
                              {match.gaps.length > 0 ? (
                                match.gaps.slice(0, 4).map((g) => (
                                  <SkillChip
                                    key={g.skillId}
                                    name={skillName(catalog, g.skillId)}
                                    status={data.skills.some((s) => s.skill_id === g.skillId) ? "improving" : "gap"}
                                  />
                                ))
                              ) : (
                                <span className="text-xs text-emerald-700 dark:text-emerald-300">Covers every listed skill</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:flex-col md:items-end">
                      <MatchBadge score={match.score} className="px-3 py-1 text-base" />
                      <span className="text-xs text-muted-foreground">{fitLabel(match)}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                    <Button asChild size="sm" variant="outline">
                      <Link prefetch={false} href={`/employer/candidates/${p.id}?job=${job.id}`}>View Profile</Link>
                    </Button>
                    <SaveCandidateButton candidateId={p.id} initialSaved={saved.has(p.id)} />
                    <MessageButton userId={p.id} jobId={job.id} disabled={!p.allow_recruiter_contact} />
                    <div className="ml-auto">
                      {status ? (
                        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                          Applied <StatusPill status={status} />
                        </span>
                      ) : p.allow_recruiter_contact ? (
                        <InviteButton candidateId={p.id} jobId={job.id} kind="apply" variant="default" initiallyInvited={invitedToApply.has(p.id)} />
                      ) : (
                        <span className="text-xs text-muted-foreground">Not accepting recruiter invitations</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
