import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Award,
  Briefcase,
  Building2,
  CalendarDays,
  ExternalLink,
  FolderGit2,
  Github,
  Globe,
  GraduationCap,
  Linkedin,
  Lock,
  MapPin,
  Medal,
  MessagesSquare,
  Pencil,
  Route,
  Sparkles,
  Target,
  TrendingUp,
  UserSearch,
} from "lucide-react";
import { ForYouLabel, SkillChip } from "@/components/app/match";
import { EmptyState } from "@/components/app/page-parts";
import { FollowButton, MessageButton } from "@/components/app/social-buttons";
import { UserAvatar } from "@/components/app/user-avatar";
import { loadJourney, loadPosts, withViewerState } from "@/components/community/data";
import { JourneyTimeline } from "@/components/community/journey-timeline";
import { PostCard } from "@/components/community/post-card";
import { BadgeStrip } from "@/components/growth/achievements";
import { ActivityHeatmap } from "@/components/growth/heatmap";
import { Button } from "@/components/ui/button";
import { LEVEL_LABELS } from "@/lib/ai/matching";
import { requireProfile } from "@/lib/auth";
import { getCatalog, skillName } from "@/lib/data/catalog";
import { type ActivityDay, loadEarnedBadges, loadPublicActivity } from "@/lib/data/growth";
import { loadCareerProfile } from "@/lib/data/profile";
import { JOB_TYPE_LABELS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Experience } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EXPERIENCE_KIND_LABELS: Record<Experience["kind"], string> = {
  internship: "Internship",
  work: "Work",
  research: "Research",
  volunteer: "Volunteer",
  other: "Experience",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return { title: "Profile not found" };
  const data = await loadCareerProfile(id);
  return { title: data?.profile.full_name ?? "Profile" };
}

function Section({ title, icon: Icon, id, children, action }: { title: string; icon: React.ComponentType<{ className?: string }>; id?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function safeHref(url: string | null | undefined) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireProfile();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const data = await loadCareerProfile(id);
  if (!data) notFound();
  const person = data.profile;
  const isSelf = viewer.id === person.id;
  const supabase = await createClient();
  // Freshen your own badges so the public page never lags behind /progress.
  if (isSelf) await supabase.rpc("refresh_achievements");

  const [canViewRes, journey, rawPosts, followers, following, myFollow, catalog, company, companyJobs, badges, activityDays] = await Promise.all([
    supabase.rpc("can_view_profile", { p_user: person.id }),
    loadJourney(person.id),
    loadPosts({ authorIds: [person.id], limit: 10 }),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("target_type", "user").eq("target_id", person.id),
    supabase.from("follows").select("target_id", { count: "exact", head: true }).eq("target_type", "user").eq("follower_id", person.id),
    supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", viewer.id)
      .eq("target_type", "user")
      .eq("target_id", person.id)
      .maybeSingle(),
    getCatalog(),
    person.role === "recruiter" && person.company_id
      ? supabase.from("companies").select("id, name, slug, industry, location").eq("id", person.company_id).maybeSingle()
      : Promise.resolve({ data: null }),
    person.role === "recruiter" && person.company_id
      ? supabase
          .from("jobs")
          .select("id, title, location, job_type")
          .eq("company_id", person.company_id)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] as { id: string; title: string; location: string | null; job_type: keyof typeof JOB_TYPE_LABELS }[] }),
    loadEarnedBadges(person.id),
    person.role === "seeker" ? loadPublicActivity(person.id) : Promise.resolve(new Map<string, ActivityDay>()),
  ]);
  const posts = await withViewerState(viewer.id, rawPosts);
  const canView = isSelf || canViewRes.data === true;
  const currentYear = new Date().getFullYear();
  const isRecruiterViewer = viewer.role === "recruiter";
  const goalCareer = data.goal ? catalog.careerById.get(data.goal.career_id) : null;
  const skills = [...data.skills].sort((a, b) => b.level - a.level);

  const links = [
    person.github_url && { href: safeHref(person.github_url)!, label: "GitHub", icon: Github },
    person.linkedin_url && { href: safeHref(person.linkedin_url)!, label: "LinkedIn", icon: Linkedin },
    person.website_url && { href: safeHref(person.website_url)!, label: hostname(safeHref(person.website_url)!), icon: Globe },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Globe }[];

  const education = [person.degree, person.university].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div aria-hidden className="h-24 bg-gradient-to-r from-emerald-500/80 via-teal-500/70 to-cyan-500/60 sm:h-32" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <UserAvatar name={person.full_name} seed={person.id} size="xl" className="ring-4 ring-card" />
            <div className="flex flex-wrap gap-2">
              {isSelf ? (
                <>
                  <Button asChild>
                    <Link href={person.role === "recruiter" ? "/settings" : "/profile"}>
                      <Pencil /> {person.role === "recruiter" ? "Edit profile settings" : "Edit Career Profile"}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/journey">
                      <Route /> Edit journey
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <FollowButton targetType="user" targetId={person.id} initialFollowing={!!myFollow.data} size="default" />
                  <MessageButton userId={person.id} size="default" />
                  {isRecruiterViewer && person.role === "seeker" && canView && !person.open_to_opportunities && (
                    <Button variant="secondary" asChild>
                      <Link href={`/employer/candidates/${person.id}`}>
                        <UserSearch /> Candidate view
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{person.full_name ?? "Member"}</h1>
              {person.role === "recruiter" && (
                <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300">Recruiter</span>
              )}
              {isRecruiterViewer && person.role === "seeker" && person.open_to_opportunities && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="h-3 w-3" aria-hidden /> Open to opportunities
                </span>
              )}
            </div>
            {person.headline && <p className="mt-1 text-base text-muted-foreground sm:text-lg">{person.headline}</p>}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              {education && (
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" aria-hidden /> {education}
                </span>
              )}
              {company.data && (
                <Link href={`/community/c/${company.data.slug}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Building2 className="h-4 w-4" aria-hidden /> {company.data.name}
                </Link>
              )}
              {person.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" aria-hidden /> {person.location}
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span>
                <span className="font-semibold tabular-nums">{followers.count ?? 0}</span>{" "}
                <span className="text-muted-foreground">{followers.count === 1 ? "follower" : "followers"}</span>
              </span>
              <span>
                <span className="font-semibold tabular-nums">{following.count ?? 0}</span> <span className="text-muted-foreground">following</span>
              </span>
              <span>
                <span className="font-semibold tabular-nums">{posts.length}</span>{" "}
                <span className="text-muted-foreground">{posts.length === 1 ? "post" : "posts"}</span>
              </span>
              {journey.length > 0 && (
                <a href="#journey" className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                  <Route className="h-4 w-4" aria-hidden /> View Career Journey
                </a>
              )}
            </div>
            {canView && links.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm hover:bg-accent"
                  >
                    <l.icon className="h-4 w-4" aria-hidden /> {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {isRecruiterViewer && person.role === "seeker" && person.open_to_opportunities && canView && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:flex-row sm:items-center">
          <Sparkles className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <p className="flex-1 text-sm">
            <span className="font-medium">{person.full_name} is open to opportunities.</span>{" "}
            <span className="text-muted-foreground">See their match against your roles, then invite them to apply or interview.</span>
          </p>
          <Button size="sm" asChild>
            <Link href={`/employer/candidates/${person.id}`}>
              Open candidate profile <ArrowRight />
            </Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {!canView ? (
            <section className="flex flex-col items-center rounded-xl border bg-card px-6 py-10 text-center">
              <span className="mb-3 rounded-full bg-muted p-3">
                <Lock className="h-6 w-6 text-muted-foreground" aria-hidden />
              </span>
              <h2 className="text-lg font-semibold">This Career Profile is private</h2>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {person.full_name ?? "This member"} keeps their skills, education and experience private. You can still follow
                them, read their community posts{journey.length > 0 ? " and see their Career Journey" : ""}.
              </p>
            </section>
          ) : (
            <>
              {person.bio && (
                <section className="rounded-xl border bg-card p-5 sm:p-6">
                  <h2 className="mb-2 text-lg font-semibold">About</h2>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">{person.bio}</p>
                </section>
              )}

              {data.experiences.length > 0 && (
                <Section title="Experience" icon={Briefcase}>
                  <ul className="space-y-5">
                    {data.experiences.map((exp) => (
                      <li key={exp.id} className="flex gap-3">
                        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium">{exp.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {[exp.organization, EXPERIENCE_KIND_LABELS[exp.kind]].filter(Boolean).join(" · ")}
                          </p>
                          {(exp.start_date || exp.end_date) && (
                            <p className="text-xs text-muted-foreground">{[exp.start_date, exp.end_date].filter(Boolean).join(" – ")}</p>
                          )}
                          {exp.description && <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/85">{exp.description}</p>}
                          {exp.skills.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {exp.skills.slice(0, 8).map((s) => (
                                <SkillChip key={s} name={skillName(catalog, s)} />
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {data.projects.length > 0 && (
                <Section title="Projects" icon={FolderGit2} id="projects">
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {data.projects.map((project) => {
                      const href = safeHref(project.url);
                      return (
                        <li key={project.id} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium">{project.name}</p>
                            {href && (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-muted-foreground hover:text-foreground"
                                aria-label={`Open ${project.name}`}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          {project.role && <p className="text-xs text-muted-foreground">{project.role}</p>}
                          {project.description && <p className="mt-1.5 line-clamp-4 text-sm text-foreground/85">{project.description}</p>}
                          {project.skills.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {project.skills.slice(0, 6).map((s) => (
                                <SkillChip key={s} name={skillName(catalog, s)} />
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Section>
              )}

              {data.educations.length > 0 && (
                <Section title="Education" icon={GraduationCap}>
                  <ul className="space-y-4">
                    {data.educations.map((edu) => (
                      <li key={edu.id} className="flex gap-3">
                        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" aria-hidden />
                        </span>
                        <div>
                          <p className="font-medium">{[edu.degree, edu.field && edu.degree?.includes(edu.field) ? null : edu.field].filter(Boolean).join(", ") || edu.school}</p>
                          <p className="text-sm text-muted-foreground">{edu.school}</p>
                          {(edu.start_date || edu.end_date) && (
                            <p className="text-xs text-muted-foreground">{[edu.start_date, edu.end_date].filter(Boolean).join(" – ")}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </>
          )}

          {person.role === "seeker" && (isSelf || activityDays.size > 0) && (
            <Section
              title="Activity"
              icon={CalendarDays}
              action={
                isSelf ? (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/progress">
                      <TrendingUp /> My progress
                    </Link>
                  </Button>
                ) : undefined
              }
            >
              {!isSelf && (
                <p className="-mt-2 mb-4 text-sm text-muted-foreground">
                  Applications, interviews and practice — consistency at a glance.
                </p>
              )}
              <ActivityHeatmap days={activityDays} />
            </Section>
          )}

          <Section
            title="Career Journey"
            icon={Route}
            id="journey"
            action={
              isSelf ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/journey">
                    <Pencil /> Edit
                  </Link>
                </Button>
              ) : undefined
            }
          >
            {journey.length === 0 ? (
              <EmptyState
                className="py-8"
                title={isSelf ? "Share how you got here" : "No Career Journey yet"}
                description={
                  isSelf
                    ? "Add a few milestones so students one step behind you can see the path."
                    : `${person.full_name ?? "This member"} hasn't shared their Career Journey yet.`
                }
                action={
                  isSelf ? (
                    <Button size="sm" asChild>
                      <Link href="/journey">Build my journey</Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                {!isSelf && <p className="-mt-2 mb-5 text-sm text-muted-foreground">How did they get there? Here&apos;s the path so far.</p>}
                <JourneyTimeline entries={journey} currentYear={currentYear} />
              </>
            )}
          </Section>

          <Section title="Community posts" icon={MessagesSquare}>
            {posts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isSelf ? (
                  <>
                    You haven&apos;t posted yet.{" "}
                    <Link href="/community/new" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                      Share an experience
                    </Link>
                  </>
                ) : (
                  "No community posts yet."
                )}
              </p>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </Section>
        </div>

        <aside className="space-y-6">
          {(badges.earned.length > 0 || (isSelf && person.role === "seeker")) && (
            <section className="rounded-xl border bg-card p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Medal className="h-4 w-4 text-amber-500" aria-hidden /> Badges
                </h2>
                {badges.earned.length > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {badges.earned.length}/{badges.totalCount} ·{" "}
                    <span className="text-amber-600 dark:text-amber-400">{badges.points} pts</span>
                  </span>
                )}
              </div>
              {badges.earned.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No badges yet.{" "}
                  <Link href="/progress" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                    Earn your first
                  </Link>
                </p>
              ) : (
                <>
                  <BadgeStrip badges={badges.earned} />
                  {isSelf && person.role === "seeker" && (
                    <Link
                      href="/progress"
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      View all badges <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </>
              )}
            </section>
          )}

          {canView && goalCareer && (
            <section className="rounded-xl border bg-card p-5">
              <ForYouLabel>{isSelf ? "Your career goal" : "Career goal"}</ForYouLabel>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
                <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {goalCareer.title}
              </p>
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{goalCareer.summary}</p>
              <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                <Link href={`/careers/${goalCareer.id}`}>Explore {goalCareer.title}</Link>
              </Button>
            </section>
          )}

          {canView && skills.length > 0 && (
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 font-semibold">Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <span key={s.skill_id} title={LEVEL_LABELS[s.level]}>
                    <SkillChip name={skillName(catalog, s.skill_id)} status={s.level >= 3 ? "have" : "neutral"} />
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">✓ marks advanced skills.</p>
            </section>
          )}

          {canView && data.portfolio.length > 0 && (
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 font-semibold">Portfolio</h2>
              <ul className="space-y-2">
                {data.portfolio.map((item) => (
                  <li key={item.id}>
                    <a
                      href={safeHref(item.url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-2 rounded-md p-1.5 hover:bg-accent"
                    >
                      {item.kind === "github" ? (
                        <Github className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      ) : (
                        <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium group-hover:underline">{item.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{hostname(safeHref(item.url)!)}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {canView && data.certifications.length > 0 && (
            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 font-semibold">Certifications</h2>
              <ul className="space-y-2">
                {data.certifications.map((c) => (
                  <li key={c.id} className="flex gap-2 text-sm">
                    <Award className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                    <span>
                      <span className="font-medium">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">{[c.issuer, c.year].filter(Boolean).join(" · ")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {company.data && (
            <section className="rounded-xl border bg-card p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
                Hiring at {company.data.name}
              </h2>
              {(companyJobs.data ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No open roles right now.</p>
              ) : (
                <ul className="mt-3 divide-y">
                  {(companyJobs.data ?? []).map((job) => (
                    <li key={job.id}>
                      <Link href={`/jobs/${job.id}`} className="group flex items-center gap-2 py-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium group-hover:underline">{job.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {JOB_TYPE_LABELS[job.job_type]}
                            {job.location ? ` · ${job.location}` : ""}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
