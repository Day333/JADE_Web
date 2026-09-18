import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Briefcase, Building2, MapPin, MessagesSquare, PenSquare, Target, Users } from "lucide-react";
import { ForYouLabel } from "@/components/app/match";
import { EmptyState } from "@/components/app/page-parts";
import { FollowButton } from "@/components/app/social-buttons";
import { UserAvatar } from "@/components/app/user-avatar";
import { findUniversityCommunity, followerCounts, loadMyFollows, loadPosts, withViewerState } from "@/components/community/data";
import { PostCard } from "@/components/community/post-card";
import { COMMUNITY_KIND_ICONS, COMMUNITY_KIND_LABELS, isPostType } from "@/components/community/post-meta";
import { TypeFilter } from "@/components/community/type-filter";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { getCatalog } from "@/lib/data/catalog";
import { JOB_TYPE_LABELS, POST_TYPE_LABELS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Company, Profile } from "@/lib/types";

async function loadCommunityOrCompany(slug: string) {
  const supabase = await createClient();
  const { data: community } = await supabase.from("communities").select("*").eq("slug", slug).maybeSingle();
  const companyId = community?.company_id ?? null;
  const { data: company } = companyId
    ? await supabase.from("companies").select("*").eq("id", companyId).maybeSingle()
    : community
      ? { data: null }
      : await supabase.from("companies").select("*").eq("slug", slug).maybeSingle();
  return { community, company: company as Company | null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { community, company } = await loadCommunityOrCompany(slug);
  return { title: community?.name ?? company?.name ?? "Community" };
}

async function loadOpenJobs(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, title, location, job_type, deadline")
    .eq("company_id", companyId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(8);
  return data ?? [];
}

async function loadUniversityPeople(name: string, viewerId: string) {
  const supabase = await createClient();
  const safe = name.replace(/[%_,()\\]/g, " ").trim();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, headline, degree")
    .ilike("university", `%${safe}%`)
    .eq("onboarding_step", "done")
    .neq("id", viewerId)
    .limit(6);
  return (data ?? []) as Pick<Profile, "id" | "full_name" | "headline" | "degree">[];
}

export default async function CommunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const profile = await requireProfile();
  const { slug } = await params;
  const sp = await searchParams;
  const type = isPostType(sp.type) ? sp.type : null;
  const { community, company } = await loadCommunityOrCompany(slug);
  if (!community && !company) notFound();

  const supabase = await createClient();
  const follows = await loadMyFollows(profile.id);
  const followTarget = community ? { type: "community" as const, id: community.id } : { type: "company" as const, id: company!.id };

  const [counts, rawPosts, postCount, jobs, goal, catalog, people] = await Promise.all([
    followerCounts(followTarget.type, [followTarget.id]),
    community ? loadPosts({ communityId: community.id, type, limit: 60 }) : Promise.resolve([]),
    community
      ? supabase.from("posts").select("id", { count: "exact", head: true }).eq("community_id", community.id)
      : Promise.resolve({ count: 0 }),
    company ? loadOpenJobs(company.id) : Promise.resolve([]),
    supabase.from("career_goals").select("career_id").eq("user_id", profile.id).maybeSingle(),
    getCatalog(),
    community?.kind === "university" ? loadUniversityPeople(community.name, profile.id) : Promise.resolve([]),
  ]);
  const posts = await withViewerState(profile.id, rawPosts);
  const members = counts.get(followTarget.id) ?? 0;
  const following = followTarget.type === "community" ? follows.community.has(followTarget.id) : follows.company.has(followTarget.id);

  const kind = community?.kind ?? "company";
  const Icon = COMMUNITY_KIND_ICONS[kind];
  const name = community?.name ?? company!.name;
  const description = community?.description ?? company?.description;
  const career = community?.career_id ? catalog.careerById.get(community.career_id) : null;
  const isGoal = !!career && goal.data?.career_id === career.id;
  const isMyUniversity = !!community && kind === "university" && findUniversityCommunity([community], profile.university)?.id === community.id;
  const isMyCompany = !!company && profile.company_id === company.id;

  return (
    <div>
      <Link href="/community" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All communities
      </Link>

      <section className="relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-emerald-400/25 to-teal-500/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
            <Icon className="h-8 w-8" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {COMMUNITY_KIND_LABELS[kind]} community
              </span>
              {isGoal && <ForYouLabel>Your career goal</ForYouLabel>}
              {isMyUniversity && <ForYouLabel>Your university</ForYouLabel>}
              {isMyCompany && <ForYouLabel>Your company</ForYouLabel>}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
            {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" aria-hidden />
                <span className="font-medium text-foreground">{members}</span> {members === 1 ? "member" : "members"}
              </span>
              {community && (
                <span className="inline-flex items-center gap-1.5">
                  <MessagesSquare className="h-4 w-4" aria-hidden />
                  <span className="font-medium text-foreground">{postCount.count ?? 0}</span> posts
                </span>
              )}
              {company && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" aria-hidden />
                  <span className="font-medium text-foreground">{jobs.length}</span> open {jobs.length === 1 ? "role" : "roles"}
                </span>
              )}
              {company?.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" aria-hidden /> {company.location}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
            <FollowButton targetType={followTarget.type} targetId={followTarget.id} initialFollowing={following} size="default" />
            {community && (
              <Button variant="outline" asChild>
                <Link href={`/community/new?community=${community.slug}`}>
                  <PenSquare /> Post in this community
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {community ? (
            <>
              <TypeFilter basePath={`/community/c/${community.slug}`} active={type} />
              {posts.length === 0 ? (
                <EmptyState
                  icon={MessagesSquare}
                  title={type ? `No ${POST_TYPE_LABELS[type]} posts here yet` : `No posts in ${community.name} yet`}
                  description="Start the conversation — share an experience, ask a question or post a useful resource."
                  action={
                    <Button asChild>
                      <Link href={`/community/new?community=${community.slug}${type ? `&type=${type}` : ""}`}>
                        <PenSquare /> Write the first post
                      </Link>
                    </Button>
                  }
                />
              ) : (
                posts.map((post) => <PostCard key={post.id} post={post} showCommunity={false} />)
              )}
            </>
          ) : (
            <EmptyState
              icon={Building2}
              title={`${name} doesn't have a discussion space yet`}
              description="Follow the company to hear about new roles, and browse their open positions."
            />
          )}
        </div>

        <aside className="space-y-4">
          {company && (
            <section className="rounded-xl border bg-card p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> Open roles at {company.name}
              </h2>
              {jobs.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No open roles right now. Follow the company to hear about new ones.</p>
              ) : (
                <ul className="mt-3 divide-y">
                  {jobs.map((job) => (
                    <li key={job.id}>
                      <Link href={`/jobs/${job.id}`} className="group flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium group-hover:underline">{job.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {JOB_TYPE_LABELS[job.job_type]}
                            {job.location ? ` · ${job.location}` : ""}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {company.industry && <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">{company.industry}{company.size ? ` · ${company.size} employees` : ""}</p>}
            </section>
          )}

          {career && (
            <section className="rounded-xl border bg-card p-5">
              {isGoal ? <ForYouLabel>Your goal</ForYouLabel> : <ForYouLabel>Explore the career</ForYouLabel>}
              <h2 className="mt-1 font-semibold">{career.title}</h2>
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{career.summary}</p>
              <div className="mt-4 flex flex-col gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/careers/${career.id}`}>
                    <Target /> {profile.role === "recruiter" ? "Career details & skills" : "Your Match & skills needed"}
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/search?q=${encodeURIComponent(career.title)}`}>
                    <Briefcase /> {career.title} jobs
                  </Link>
                </Button>
              </div>
            </section>
          )}

          {kind === "university" && (
            <section className="rounded-xl border bg-card p-5">
              <h2 className="font-semibold">People from {name}</h2>
              {people.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No other students or alumni have joined yet — invite your classmates.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {people.map((p) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <UserAvatar name={p.full_name} seed={p.id} size="sm" />
                      <Link href={`/u/${p.id}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium hover:underline">{p.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.headline ?? p.degree}</p>
                      </Link>
                      <FollowButton targetType="user" targetId={p.id} initialFollowing={follows.user.has(p.id)} variant="outline" />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Community guidelines</p>
            <p className="mt-1">Share real experiences, be kind, and never post confidential or personal information about others.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
