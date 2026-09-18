import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Briefcase, ExternalLink, FolderGit2, GraduationCap, Pencil } from "lucide-react";
import { ForYouLabel, MatchBadge, SkillChip } from "@/components/app/match";
import { EmptyState, PageHeader } from "@/components/app/page-parts";
import { UserAvatar } from "@/components/app/user-avatar";
import { ApplyForm, type ResumeOption } from "@/components/jobs/apply-form";
import { CompanyMark, JobMeta, SampleTag } from "@/components/jobs/job-parts";
import { Button } from "@/components/ui/button";
import { matchJob } from "@/lib/ai/matching";
import { requireProfile } from "@/lib/auth";
import { getCatalog, skillName } from "@/lib/data/catalog";
import { loadJob } from "@/lib/data/jobs";
import { loadCareerProfile } from "@/lib/data/profile";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Review Application" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const profile = await requireProfile({ role: "seeker" });
  const supabase = await createClient();

  const [job, catalog, data, appResult, resumesResult] = await Promise.all([
    loadJob(id),
    getCatalog(),
    loadCareerProfile(profile.id),
    supabase.from("applications").select("id, status, cover_letter").eq("job_id", id).eq("user_id", profile.id).maybeSingle(),
    supabase
      .from("resumes")
      .select("id, file_name, is_primary, created_at")
      .eq("user_id", profile.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (!data) redirect("/onboarding");
  const application = appResult.data;
  if (application && !["saved", "withdrawn"].includes(application.status)) {
    redirect(`/applications/${application.id}`);
  }

  if (!job || job.status !== "open") {
    return (
      <div className="mx-auto max-w-xl py-10">
        <EmptyState
          icon={Briefcase}
          title="This job is no longer accepting applications"
          description="The employer has closed or removed the listing."
          action={
            <Button asChild>
              <Link href="/jobs">Browse open jobs</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const companyName = job.company?.name ?? "the company";
  const match = matchJob(data, catalog, job);
  const resumes: ResumeOption[] = (resumesResult.data ?? []).map((r) => ({
    id: r.id,
    fileName: r.file_name,
    uploaded: formatDate(r.created_at),
    isPrimary: r.is_primary,
  }));

  // Job-relevant skills first, then the rest by level.
  const jobSkills = new Set([...job.required_skills, ...job.preferred_skills]);
  const topSkills = [...data.skills]
    .sort((a, b) => Number(jobSkills.has(b.skill_id)) - Number(jobSkills.has(a.skill_id)) || b.level - a.level)
    .slice(0, 10);
  const education = data.educations[0];
  const links = [
    ...data.portfolio.map((p) => ({ title: p.title, url: p.url })),
    ...(data.profile.github_url ? [{ title: "GitHub", url: data.profile.github_url }] : []),
    ...(data.profile.linkedin_url ? [{ title: "LinkedIn", url: data.profile.linkedin_url }] : []),
    ...(data.profile.website_url ? [{ title: "Website", url: data.profile.website_url }] : []),
  ];
  const projectLinks = data.projects.filter((p) => p.url).map((p) => ({ title: `Project: ${p.name}`, url: p.url! }));
  const allLinks = [...links, ...projectLinks];

  const profileSummary = (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <UserAvatar name={data.profile.full_name} seed={data.profile.id} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{data.profile.full_name}</p>
          {data.profile.headline && <p className="text-sm text-muted-foreground">{data.profile.headline}</p>}
          {(education || data.profile.university) && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4 shrink-0" />
              {[education?.degree ?? data.profile.degree, education?.school ?? data.profile.university].filter(Boolean).join(", ")}
              {data.profile.graduation_year ? ` · ${data.profile.graduation_year}` : ""}
            </p>
          )}
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/profile">
            <Pencil />
            Edit
          </Link>
        </Button>
      </div>
      {topSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topSkills.map((s) => (
            <SkillChip key={s.skill_id} name={skillName(catalog, s.skill_id)} status={jobSkills.has(s.skill_id) ? "have" : "neutral"} />
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Experience", value: data.experiences.length },
          { label: "Projects", value: data.projects.length },
          { label: "Certifications", value: data.certifications.length },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-muted/50 p-2">
            <p className="text-lg font-semibold tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const portfolioSummary =
    allLinks.length > 0 ? (
      <ul className="divide-y rounded-xl border">
        {allLinks.map((l) => (
          <li key={`${l.title}-${l.url}`} className="flex items-center gap-3 p-3 text-sm">
            <FolderGit2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-medium">{l.title}</span>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground"
            >
              {hostOf(l.url)}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </li>
        ))}
      </ul>
    ) : (
      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        No portfolio links yet.{" "}
        <Link href="/profile" className="font-medium text-foreground underline-offset-4 hover:underline">
          Add GitHub, a website or project links
        </Link>{" "}
        to stand out.
      </div>
    );

  return (
    <div className="space-y-6">
      <Link href={`/jobs/${job.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to job
      </Link>
      <PageHeader
        eyebrow={<ForYouLabel>Review Application</ForYouLabel>}
        title="Review your application"
        description={`Check what ${companyName} will receive. You can change anything before you submit.`}
        className="mb-0"
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="order-2 lg:order-1">
          <ApplyForm
            jobId={job.id}
            companyName={companyName}
            resumes={resumes}
            profileSummary={profileSummary}
            portfolioSummary={portfolioSummary}
            hasPortfolio={allLinks.length > 0}
            initialCoverLetter={application?.cover_letter ?? ""}
          />
        </div>
        <aside className="order-1 lg:order-2">
          <div className="space-y-4 rounded-2xl border bg-card p-5 lg:sticky lg:top-20">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">You&apos;re applying for</p>
            <div className="flex items-start gap-3">
              <CompanyMark name={job.company?.name} />
              <div className="min-w-0">
                <p className="font-semibold leading-snug">{job.title}</p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {job.company?.name}
                  {job.company?.is_sample && <SampleTag />}
                </p>
              </div>
            </div>
            <JobMeta job={job} showSalary showDeadline />
            <div className="space-y-2 rounded-xl bg-muted/40 p-3">
              <MatchBadge score={match.score} label="Your match" />
              <p className="text-sm">{match.message}</p>
              {match.gaps.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Mention how you&apos;re building{" "}
                  {match.gaps
                    .slice(0, 2)
                    .map((g) => skillName(catalog, g.skillId))
                    .join(" and ")}{" "}
                  in your cover letter.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
