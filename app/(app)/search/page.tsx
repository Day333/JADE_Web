import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Compass,
  MapPin,
  MessagesSquare,
  Search as SearchIcon,
  SearchX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/app/page-parts";
import { UserAvatar } from "@/components/app/user-avatar";
import { excerpt, PostTypeBadge } from "@/components/community/post-card";
import { COMMUNITY_KIND_ICONS, COMMUNITY_KIND_LABELS } from "@/components/community/post-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireProfile } from "@/lib/auth";
import { JOB_TYPE_LABELS, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { CommunityKind, JobType, PostType, UserRole } from "@/lib/types";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return { title: q?.trim() ? `Search: ${q.trim()}` : "Search" };
}

const SECTIONS = ["careers", "jobs", "people", "posts", "communities", "companies"] as const;
type SectionId = (typeof SECTIONS)[number];

const SECTION_META: Record<SectionId, { label: string; icon: LucideIcon }> = {
  careers: { label: "Careers", icon: Compass },
  jobs: { label: "Jobs", icon: Briefcase },
  people: { label: "People", icon: Users },
  posts: { label: "Posts", icon: MessagesSquare },
  communities: { label: "Communities", icon: Users },
  companies: { label: "Companies", icon: Building2 },
};

const SUGGESTIONS = ["Data Scientist", "Graduate program", "Internship", "Software Engineer", "UTS", "Interview", "Cybersecurity"];

/**
 * An `.or()` filter matching `q` anywhere in any of the columns.
 * LIKE wildcards (% _) and backslashes are escaped, then the whole pattern is
 * double-quoted so PostgREST's reserved characters (, . : ( ) ") are literal.
 */
function ilikeAny(columns: string[], q: string, extra: string[] = []) {
  const like = `%${q.replace(/\*/g, " ").replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const quoted = `"${like.replace(/[\\"]/g, (c) => `\\${c}`)}"`;
  return [...columns.map((c) => `${c}.ilike.${quoted}`), ...extra].join(",");
}

function quotedValue(q: string) {
  return `"${q.replace(/[\\"]/g, (c) => `\\${c}`)}"`;
}

/**
 * Search terms: each word must match somewhere (AND), and longer words are
 * shortened to a stem so "Scientist" also finds "Data Science".
 */
function searchTerms(q: string) {
  const words = q
    .replace(/\*/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2)
    .slice(0, 5);
  if (words.length === 0) return [q];
  return words.map((w) => (w.length >= 7 ? w.slice(0, Math.max(5, w.length - 4)) : w));
}

type OrFilterable<Q> = { or: (filters: string) => Q };

/** Chain one `.or()` per term, so every term must match one of the columns. */
function matchAll<Q extends OrFilterable<Q>>(query: Q, columns: string[], terms: string[], extra?: (term: string) => string[]) {
  return terms.reduce((acc, term) => acc.or(ilikeAny(columns, term, extra?.(term))), query);
}

/** Higher = better: the exact phrase in the main field first, then more matching terms. */
function relevance(q: string, terms: string[], primary: string | null | undefined, secondary: string | null | undefined = "") {
  const a = (primary ?? "").toLowerCase();
  const b = (secondary ?? "").toLowerCase();
  const phrase = q.toLowerCase();
  let score = 0;
  if (a === phrase) score += 20;
  if (a.includes(phrase)) score += 10;
  if (b.includes(phrase)) score += 4;
  for (const t of terms) {
    const term = t.toLowerCase();
    if (a.includes(term)) score += 2;
    if (b.includes(term)) score += 1;
  }
  return score;
}

type CareerHit = { id: string; title: string; field: string; summary: string };
type JobHit = {
  id: string;
  title: string;
  location: string | null;
  job_type: JobType;
  created_at: string;
  description: string | null;
  company: { name: string; slug: string } | null;
};
type PersonHit = {
  id: string;
  full_name: string | null;
  headline: string | null;
  university: string | null;
  role: UserRole;
  goalTitle?: string | null;
};
type PostHit = {
  id: string;
  title: string;
  body: string;
  type: PostType;
  created_at: string;
  like_count: number;
  comment_count: number;
  author: { id: string; full_name: string | null } | null;
  community: { name: string; slug: string } | null;
};
type CommunityHit = { id: string; slug: string; name: string; kind: CommunityKind; description: string | null };
type CompanyHit = { id: string; slug: string; name: string; industry: string | null; location: string | null; is_sample: boolean };

const POST_FIELDS =
  "id, title, body, type, created_at, like_count, comment_count, author:profiles!posts_author_id_fkey(id, full_name), community:communities!posts_community_id_fkey(name, slug)";

async function runSearch(q: string, only: SectionId | null) {
  const supabase = await createClient();
  const terms = searchTerms(q);
  const want = (id: SectionId) => !only || only === id;
  const none = <T,>() => Promise.resolve({ data: [] as T[], count: 0, error: null });
  const FETCH = 50;

  const [careers, jobs, people, posts, communities, companies] = await Promise.all([
    want("careers") || want("people")
      ? matchAll(supabase.from("careers").select("id, title, field, summary", { count: "exact" }), ["title", "summary", "field"], terms).limit(FETCH)
      : none<CareerHit>(),
    want("jobs")
      ? matchAll(
          supabase
            .from("jobs")
            .select("id, title, location, job_type, created_at, description, company:companies!jobs_company_id_fkey(name, slug)", {
              count: "exact",
            })
            .eq("status", "open"),
          ["title", "description", "industry"],
          terms,
        )
          .order("created_at", { ascending: false })
          .limit(FETCH)
      : none<JobHit>(),
    want("people")
      ? matchAll(
          supabase.from("profiles").select("id, full_name, headline, university, role", { count: "exact" }).eq("onboarding_step", "done"),
          ["full_name", "headline", "university", "major", "degree"],
          terms,
        ).limit(FETCH)
      : none<PersonHit>(),
    want("posts")
      ? matchAll(supabase.from("posts").select(POST_FIELDS, { count: "exact" }), ["title", "body"], terms, () => [
          `tags.cs.{${quotedValue(q)}}`,
        ])
          .order("created_at", { ascending: false })
          .limit(FETCH)
      : none<PostHit>(),
    want("communities") || want("posts")
      ? matchAll(supabase.from("communities").select("id, slug, name, kind, description", { count: "exact" }), ["name", "description"], terms).limit(FETCH)
      : none<CommunityHit>(),
    want("companies")
      ? matchAll(supabase.from("companies").select("id, slug, name, industry, location, is_sample", { count: "exact" }), ["name", "industry"], terms).limit(FETCH)
      : none<CompanyHit>(),
  ]);

  const careerRows = (careers.data ?? []) as CareerHit[];
  const communityRows = (communities.data ?? []) as CommunityHit[];

  // People whose (visible) career goal matches, e.g. everyone aiming for "Data Scientist".
  let peopleRows = ((people.data ?? []) as PersonHit[]).map((p) => ({ ...p, goalTitle: null as string | null }));
  // Only careers whose title matches every term (e.g. "Data Scientist", not every career mentioning data).
  const topCareers = careerRows.filter((c) => terms.every((t) => c.title.toLowerCase().includes(t.toLowerCase()))).slice(0, 3);
  if (want("people") && topCareers.length > 0) {
    const titleById = new Map(topCareers.map((c) => [c.id, c.title]));
    const { data: goals } = await supabase
      .from("career_goals")
      .select("user_id, career_id")
      .in("career_id", [...titleById.keys()])
      .limit(FETCH);
    const goalByUser = new Map((goals ?? []).map((g) => [g.user_id, titleById.get(g.career_id) ?? null]));
    const missing = [...goalByUser.keys()].filter((id) => !peopleRows.some((p) => p.id === id));
    if (missing.length > 0) {
      const { data: extra } = await supabase
        .from("profiles")
        .select("id, full_name, headline, university, role")
        .in("id", missing)
        .eq("onboarding_step", "done");
      peopleRows = [...peopleRows, ...((extra ?? []) as PersonHit[]).map((p) => ({ ...p, goalTitle: null }))];
    }
    peopleRows = peopleRows.map((p) => ({ ...p, goalTitle: goalByUser.get(p.id) ?? null }));
  }

  // Posts in matching communities count too (e.g. "Data Scientist" → the Data Science community).
  let postRows = (posts.data ?? []) as unknown as PostHit[];
  let postCount = posts.count ?? 0;
  if (want("posts") && communityRows.length > 0) {
    const { data: communityPosts } = await supabase
      .from("posts")
      .select(POST_FIELDS)
      .in(
        "community_id",
        communityRows.map((c) => c.id),
      )
      .order("created_at", { ascending: false })
      .limit(FETCH);
    const extra = ((communityPosts ?? []) as unknown as PostHit[]).filter((p) => !postRows.some((r) => r.id === p.id));
    postRows = [...postRows, ...extra];
    postCount += extra.length;
  }

  const size = (id: SectionId) => (only === id ? FETCH : id === "people" ? 8 : 6);
  const rank = <T,>(rows: T[], score: (row: T) => number, id: SectionId) =>
    rows
      .map((row, i) => ({ row, i, s: score(row) }))
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .map((r) => r.row)
      .slice(0, size(id));

  const failed = [careers, jobs, people, posts, communities, companies].some((r) => r.error);
  return {
    failed,
    careers: {
      items: want("careers") ? rank(careerRows, (c) => relevance(q, terms, c.title, c.summary), "careers") : [],
      count: want("careers") ? (careers.count ?? 0) : 0,
    },
    jobs: {
      items: rank((jobs.data ?? []) as unknown as JobHit[], (j) => relevance(q, terms, j.title, j.description), "jobs"),
      count: jobs.count ?? 0,
    },
    people: {
      items: rank(peopleRows, (p) => relevance(q, terms, p.full_name, `${p.headline ?? ""} ${p.goalTitle ?? ""}`), "people"),
      count: want("people") ? Math.max(people.count ?? 0, peopleRows.length) : 0,
    },
    posts: {
      items: rank(postRows, (p) => relevance(q, terms, p.title, p.body), "posts"),
      count: postCount,
    },
    communities: {
      items: want("communities") ? rank(communityRows, (c) => relevance(q, terms, c.name, c.description), "communities") : [],
      count: want("communities") ? (communities.count ?? 0) : 0,
    },
    companies: {
      items: rank((companies.data ?? []) as CompanyHit[], (c) => relevance(q, terms, c.name, c.industry), "companies"),
      count: companies.count ?? 0,
    },
  };
}

function SearchBox({ q, autoFocus }: { q: string; autoFocus?: boolean }) {
  return (
    <form action="/search" role="search" className="relative">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        name="q"
        type="search"
        defaultValue={q}
        autoFocus={autoFocus}
        placeholder="Search careers, jobs, people, companies, posts…"
        aria-label="Search"
        className="h-12 rounded-xl pl-11 pr-24 text-base md:text-base"
      />
      <Button type="submit" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2">
        Search
      </Button>
    </form>
  );
}

function SectionCard({
  id,
  count,
  shown,
  q,
  expanded,
  children,
}: {
  id: SectionId;
  count: number;
  shown: number;
  q: string;
  expanded: boolean;
  children: React.ReactNode;
}) {
  const meta = SECTION_META[id];
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <meta.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          {meta.label}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">{count}</span>
        </h2>
        {!expanded && count > shown && (
          <Link
            href={`/search?q=${encodeURIComponent(q)}&in=${id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Show all {count} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <div className="p-2">{children}</div>
    </section>
  );
}

const rowClass = "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/60";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; in?: string }> }) {
  await requireProfile();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const only = SECTIONS.includes(sp.in as SectionId) ? (sp.in as SectionId) : null;

  if (!q) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">Search</h1>
        <SearchBox q="" autoFocus />
        <div className="mt-8">
          <p className="text-sm font-medium text-muted-foreground">Try searching for</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Link
                key={s}
                href={`/search?q=${encodeURIComponent(s)}`}
                className="rounded-full border bg-card px-3 py-1.5 text-sm hover:border-emerald-500/50 hover:bg-emerald-500/5"
              >
                {s}
              </Link>
            ))}
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { href: "/careers", label: "Explore careers", icon: Compass },
              { href: "/jobs", label: "Browse jobs", icon: Briefcase },
              { href: "/community", label: "Community", icon: MessagesSquare },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-emerald-500/50">
                <l.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <span className="font-medium">{l.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const results = await runSearch(q, only);
  const counts: Record<SectionId, number> = {
    careers: results.careers.count,
    jobs: results.jobs.count,
    people: results.people.count,
    posts: results.posts.count,
    communities: results.communities.count,
    companies: results.companies.count,
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const withResults = SECTIONS.filter((s) => counts[s] > 0);

  return (
    <div className="mx-auto max-w-4xl">
      <SearchBox q={q} />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {only ? (
            <>
              <span className="font-medium text-foreground">{counts[only]}</span> {SECTION_META[only].label.toLowerCase()} for “{q}” ·{" "}
              <Link href={`/search?q=${encodeURIComponent(q)}`} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                All results
              </Link>
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">{total}</span> {total === 1 ? "result" : "results"} for “{q}”
            </>
          )}
        </p>
        {!only && withResults.length > 1 && (
          <nav aria-label="Jump to section" className="-mx-4 min-w-0 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex w-max gap-1.5">
              {withResults.map((s) => (
                <a key={s} href={`#${s}`} className="rounded-full border bg-card px-2.5 py-1 text-xs font-medium hover:bg-accent">
                  {SECTION_META[s].label} <span className="text-muted-foreground">{counts[s]}</span>
                </a>
              ))}
            </div>
          </nav>
        )}
      </div>

      {results.failed && (
        <p role="alert" className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Some results could not be loaded. Please try again.
        </p>
      )}

      {total === 0 ? (
        <EmptyState
          className="mt-6"
          icon={SearchX}
          title={`Nothing found for “${q}”`}
          description="Check the spelling, try a broader word (e.g. “data” instead of “data scientist intern”), or search for a university, company or skill."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.slice(0, 4).map((s) => (
                <Button key={s} variant="outline" size="sm" asChild>
                  <Link href={`/search?q=${encodeURIComponent(s)}`}>{s}</Link>
                </Button>
              ))}
            </div>
          }
        />
      ) : (
        <div className="mt-6 space-y-6">
          {results.careers.items.length > 0 && (
            <SectionCard id="careers" count={counts.careers} shown={results.careers.items.length} q={q} expanded={!!only}>
              <ul>
                {results.careers.items.map((c) => (
                  <li key={c.id}>
                    <Link href={`/careers/${c.id}`} className={rowClass}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        <Compass className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{c.title}</span>
                        <span className="line-clamp-1 text-sm text-muted-foreground">
                          {c.field} · {c.summary}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {results.jobs.items.length > 0 && (
            <SectionCard id="jobs" count={counts.jobs} shown={results.jobs.items.length} q={q} expanded={!!only}>
              <ul>
                {results.jobs.items.map((j) => (
                  <li key={j.id}>
                    <Link href={`/jobs/${j.id}`} className={rowClass}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <Briefcase className="h-5 w-5 text-muted-foreground" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{j.title}</span>
                        <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                          {j.company?.name && <span>{j.company.name}</span>}
                          <span>· {JOB_TYPE_LABELS[j.job_type]}</span>
                          {j.location && (
                            <span className="inline-flex items-center gap-1">
                              · <MapPin className="h-3 w-3" aria-hidden /> {j.location}
                            </span>
                          )}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {results.people.items.length > 0 && (
            <SectionCard id="people" count={counts.people} shown={results.people.items.length} q={q} expanded={!!only}>
              <ul className="grid sm:grid-cols-2">
                {results.people.items.map((p) => (
                  <li key={p.id}>
                    <Link href={`/u/${p.id}`} className={rowClass}>
                      <UserAvatar name={p.full_name} seed={p.id} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium">{p.full_name ?? "Member"}</span>
                          {p.role === "recruiter" && (
                            <span className="shrink-0 rounded bg-sky-500/10 px-1 py-px text-[10px] font-semibold uppercase text-sky-700 dark:text-sky-300">
                              Recruiter
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {p.goalTitle ? (
                            <span className="text-emerald-700 dark:text-emerald-400">Goal: {p.goalTitle}</span>
                          ) : (
                            [p.headline, p.university].filter(Boolean).join(" · ") || "Member"
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {results.posts.items.length > 0 && (
            <SectionCard id="posts" count={counts.posts} shown={results.posts.items.length} q={q} expanded={!!only}>
              <ul>
                {results.posts.items.map((p) => (
                  <li key={p.id}>
                    <Link href={`/community/post/${p.id}`} className={cn(rowClass, "items-start")}>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <PostTypeBadge type={p.type} />
                          {p.community && <span className="text-xs text-muted-foreground">{p.community.name}</span>}
                        </span>
                        <span className="mt-1 block font-medium">{p.title}</span>
                        <span className="line-clamp-2 text-sm text-muted-foreground">{excerpt(p.body, 180)}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {p.author?.full_name ?? "Member"} · {timeAgo(p.created_at)} · {p.like_count} likes · {p.comment_count} comments
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {results.communities.items.length > 0 && (
            <SectionCard id="communities" count={counts.communities} shown={results.communities.items.length} q={q} expanded={!!only}>
              <ul className="grid sm:grid-cols-2">
                {results.communities.items.map((c) => {
                  const Icon = COMMUNITY_KIND_ICONS[c.kind];
                  return (
                    <li key={c.id}>
                      <Link href={`/community/c/${c.slug}`} className={rowClass}>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{c.name}</span>
                          <span className="block truncate text-sm text-muted-foreground">{COMMUNITY_KIND_LABELS[c.kind]} community</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          )}

          {results.companies.items.length > 0 && (
            <SectionCard id="companies" count={counts.companies} shown={results.companies.items.length} q={q} expanded={!!only}>
              <ul className="grid sm:grid-cols-2">
                {results.companies.items.map((c) => (
                  <li key={c.id}>
                    <Link href={`/community/c/${c.slug}`} className={rowClass}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{c.name}</span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {[c.industry, c.location].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}
