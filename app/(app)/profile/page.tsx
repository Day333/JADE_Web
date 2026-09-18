import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Github,
  Globe,
  GraduationCap,
  Linkedin,
  MapPin,
  Settings,
  Target,
  Upload,
  X,
} from "lucide-react";
import { ForYouLabel, MeterRow, ReadinessRing } from "@/components/app/match";
import { UserAvatar } from "@/components/app/user-avatar";
import { Button } from "@/components/ui/button";
import {
  BasicsSection,
  CertificationsSection,
  EducationSection,
  ExperienceSection,
  InterestsSection,
  PortfolioSection,
  PreferencesSection,
  ProjectsSection,
  ResumesSection,
  SkillsSection,
  type SkillView,
} from "@/components/profile/profile-sections";
import { customSkillNames } from "@/components/profile/server";
import { displayUrl, type PortfolioKind } from "@/components/profile/model";
import { requireProfile } from "@/lib/auth";
import { computeReadiness, skillEvidence } from "@/lib/ai/matching";
import { preferenceDisplayRows, type PreferenceScores } from "@/lib/ai/questionnaire";
import { getCatalog, skillName } from "@/lib/data/catalog";
import { loadCareerProfile } from "@/lib/data/profile";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Career Profile" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; preferences?: string }>;
}) {
  const { updated, preferences: prefsSaved } = await searchParams;
  const me = await requireProfile({ role: "seeker" });
  const supabase = await createClient();
  const [data, catalog, resumesRes] = await Promise.all([
    loadCareerProfile(me.id),
    getCatalog(),
    supabase
      .from("resumes")
      .select("id, file_name, created_at, is_primary")
      .eq("user_id", me.id)
      .order("created_at", { ascending: false }),
  ]);
  if (!data) return null;
  const { profile } = data;

  // Skills (custom skills are not in the cached catalogue)
  const allSkillIds = [
    ...data.skills.map((s) => s.skill_id),
    ...data.experiences.flatMap((e) => e.skills),
    ...data.projects.flatMap((p) => p.skills),
  ];
  const customs = await customSkillNames(supabase, catalog, allSkillIds);
  const nameOf = (id: string) => catalog.skillById.get(id)?.name ?? customs.get(id)?.name ?? skillName(catalog, id);
  const skillNames = Object.fromEntries([...new Set(allSkillIds)].map((id) => [id, nameOf(id)]));
  const skills: SkillView[] = data.skills
    .map((s) => ({
      skillId: s.skill_id,
      name: nameOf(s.skill_id),
      level: s.level,
      category: catalog.skillById.get(s.skill_id)?.category ?? customs.get(s.skill_id)?.category ?? "technical",
      evidence: skillEvidence(data, catalog, s.skill_id),
    }))
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  const hardSkills = skills.filter((s) => s.category !== "soft");
  const softSkills = skills.filter((s) => s.category === "soft");
  const options = catalog.skills.map((s) => ({ id: s.id, name: s.name, category: s.category, aliases: s.aliases }));

  // Goal & readiness
  const goalCareer = data.goal ? catalog.careerById.get(data.goal.career_id) : undefined;
  const readiness = goalCareer ? computeReadiness(data, catalog, goalCareer.id) : null;

  // Preferences
  const prefs = data.preferences;
  const scores = (prefs?.scores ?? {}) as PreferenceScores;
  const rows = Object.keys(scores).length > 0 ? preferenceDisplayRows(scores) : null;

  const resumes = (resumesRes.data ?? []).map((r) => ({
    id: r.id,
    fileName: r.file_name,
    uploaded: formatDate(r.created_at),
    isPrimary: r.is_primary,
  }));

  // Profile strength
  const checklist = [
    { label: "Add a headline", done: Boolean(profile.headline), href: "#basic-information" },
    { label: "Add your education", done: data.educations.length > 0, href: "#education" },
    { label: "Add an experience", done: data.experiences.length > 0, href: "#experience" },
    { label: "Add two projects", done: data.projects.length >= 2, href: "#projects" },
    { label: "List at least 5 skills", done: hardSkills.length >= 5, href: "#skills" },
    { label: "Add a soft skill", done: softSkills.length > 0, href: "#soft-skills" },
    {
      label: "Link your GitHub or portfolio",
      done: Boolean(profile.github_url || profile.website_url || data.portfolio.length > 0),
      href: "#portfolio",
    },
    { label: "Answer the preference questions", done: rows !== null, href: "#preferences" },
    { label: "Upload a resume", done: resumes.length > 0, href: "#resume" },
    { label: "Set a career goal", done: Boolean(goalCareer), href: "/careers" },
  ];
  const strength = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
  const todo = checklist.filter((c) => !c.done);

  const study = [
    profile.degree || profile.major,
    profile.university,
    profile.graduation_year ? `Class of ${profile.graduation_year}` : null,
  ].filter(Boolean);
  const links = [
    { href: profile.github_url, icon: Github, label: "GitHub" },
    { href: profile.linkedin_url, icon: Linkedin, label: "LinkedIn" },
    { href: profile.website_url, icon: Globe, label: "Website" },
  ].filter((l): l is { href: string; icon: typeof Github; label: string } => Boolean(l.href));

  const strengthCard = (
    <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6" aria-label="Profile strength">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">
          Profile strength
        </h2>
        <span className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{strength}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
          style={{ width: `${strength}%` }}
        />
      </div>
      {todo.length > 0 ? (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Next Step</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {todo.slice(0, 4).map((item) => (
              <li key={item.label}>
                <a href={item.href} className="flex items-center gap-2 hover:text-emerald-700 dark:hover:text-emerald-400">
                  <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> Your profile is
          complete. Keep it up to date as you grow.
        </p>
      )}
    </section>
  );

  return (
    <div className="space-y-6">
      {(updated === "1" || prefsSaved === "1") && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <div className="flex-1">
            <p className="font-medium">
              {updated === "1" ? "Your Career Profile has been updated from your new resume." : "Your career preferences were saved."}
            </p>
            <p className="text-muted-foreground">Your career matches and skill gaps now use the latest information.</p>
          </div>
          <Link href="/profile" aria-label="Dismiss" className="rounded p-1 text-muted-foreground hover:bg-emerald-500/10">
            <X className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}

      {/* Header */}
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div aria-hidden className="h-24 bg-gradient-to-r from-emerald-500/25 via-teal-500/15 to-cyan-500/25 sm:h-28" />
        <div className="grid gap-6 px-5 pb-6 sm:px-8 lg:grid-cols-[1fr_minmax(0,360px)]">
          <div className="-mt-12 min-w-0 space-y-4">
            <UserAvatar name={profile.full_name} seed={profile.id} size="xl" className="ring-4 ring-card" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{profile.full_name}</h1>
                {profile.open_to_opportunities ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Open to Opportunities
                  </span>
                ) : null}
              </div>
              {profile.headline && <p className="text-muted-foreground">{profile.headline}</p>}
            </div>
            <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              {study.length > 0 && (
                <span className="flex items-start gap-2">
                  <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {study.join(" · ")}
                </span>
              )}
              {profile.location && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden /> {profile.location}
                </span>
              )}
            </div>
            {links.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {links.map(({ href, icon: Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:border-emerald-500/50 hover:bg-emerald-500/5"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{displayUrl(href)}</span>
                  </a>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/u/${profile.id}`}>
                  <Eye aria-hidden /> View public profile
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings">
                  <Settings aria-hidden /> Privacy &amp; settings
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/onboarding/resume?update=1">
                  <Upload aria-hidden /> Upload newer resume
                </Link>
              </Button>
            </div>
            {!profile.profile_public && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <EyeOff className="h-3.5 w-3.5" aria-hidden /> Your Career Profile is private — only you
                {profile.open_to_opportunities ? " and recruiters" : ""} can see the details.
              </p>
            )}
          </div>

          {/* Career goal & readiness */}
          <div className="self-start rounded-xl border bg-gradient-to-br from-emerald-500/[0.07] to-cyan-500/[0.07] p-5 lg:mt-6">
            {goalCareer && readiness ? (
              <div className="space-y-4">
                <div>
                  <ForYouLabel>Career Goal</ForYouLabel>
                  <Link href={`/careers/${goalCareer.id}`} className="mt-1 block text-lg font-semibold hover:underline">
                    {goalCareer.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{goalCareer.field}</p>
                </div>
                <div className="flex items-center gap-5">
                  <ReadinessRing value={readiness.overall} size={96} stroke={9} label="Ready" />
                  <div className="flex-1 space-y-2">
                    <MeterRow label="Skills" value={readiness.skills} />
                    <MeterRow label="Projects" value={readiness.projects} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MeterRow label="Experience" value={readiness.experience} />
                  <MeterRow label="Portfolio" value={readiness.portfolio} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <Link href="/skill-gap">
                      Your Skill Gap <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild className="bg-background/60">
                    <Link href="/roadmap">Your Roadmap</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  <Target className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold">Set your Career Goal</p>
                  <p className="text-sm text-muted-foreground">
                    Pick a career you&apos;re aiming for and we&apos;ll track how ready you are, show your skill gap and
                    build a roadmap.
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link href="/careers">
                    Explore career matches <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="lg:hidden">{strengthCard}</div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <BasicsSection
            basics={{
              fullName: profile.full_name ?? "",
              headline: profile.headline ?? "",
              bio: profile.bio ?? "",
              location: profile.location ?? "",
              university: profile.university ?? "",
              degree: profile.degree ?? "",
              major: profile.major ?? "",
              graduationYear: profile.graduation_year ? String(profile.graduation_year) : "",
            }}
          />
          <EducationSection
            items={data.educations.map((e) => ({
              id: e.id,
              school: e.school,
              degree: e.degree ?? "",
              field: e.field ?? "",
              startDate: e.start_date ?? "",
              endDate: e.end_date ?? "",
              courses: e.courses,
            }))}
          />
          <ExperienceSection
            skillNames={skillNames}
            items={data.experiences.map((e) => ({
              id: e.id,
              title: e.title,
              organization: e.organization ?? "",
              kind: e.kind,
              startDate: e.start_date ?? "",
              endDate: e.end_date ?? "",
              description: e.description ?? "",
              skills: e.skills,
            }))}
          />
          <ProjectsSection
            skillNames={skillNames}
            items={data.projects.map((p) => ({
              id: p.id,
              name: p.name,
              role: p.role ?? "",
              description: p.description ?? "",
              url: p.url ?? "",
              skills: p.skills,
            }))}
          />
          <SkillsSection kind="skills" skills={hardSkills} options={options} />
          <SkillsSection kind="soft" skills={softSkills} options={options} />
          <CertificationsSection
            items={data.certifications.map((c) => ({
              id: c.id,
              name: c.name,
              issuer: c.issuer ?? "",
              year: c.year ?? "",
              url: c.url ?? "",
            }))}
          />
        </div>

        <div className="min-w-0 space-y-6">
          <div className="hidden lg:block">{strengthCard}</div>
          <PortfolioSection
            links={{
              github: profile.github_url ?? "",
              linkedin: profile.linkedin_url ?? "",
              website: profile.website_url ?? "",
            }}
            items={data.portfolio.map((p) => ({
              id: p.id,
              title: p.title,
              url: p.url,
              kind: p.kind as PortfolioKind,
              description: p.description ?? "",
            }))}
          />
          <InterestsSection
            industries={prefs?.interested_industries ?? []}
            careers={prefs?.interested_careers ?? []}
            careerOptions={catalog.careers.map((c) => ({ id: c.id, title: c.title, field: c.field }))}
          />
          <PreferencesSection
            workTypes={prefs?.work_types ?? []}
            companyTypes={prefs?.company_types ?? []}
            locations={prefs?.preferred_locations ?? []}
            rows={rows}
          />
          <ResumesSection resumes={resumes} />
        </div>
      </div>
    </div>
  );
}
