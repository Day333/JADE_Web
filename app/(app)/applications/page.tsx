import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Briefcase, CalendarCheck, Mail, Send, Trophy } from "lucide-react";
import { ForYouLabel, MatchBadge } from "@/components/app/match";
import { EmptyState, PageHeader } from "@/components/app/page-parts";
import { InvitationActions } from "@/components/jobs/invitation-actions";
import { CompanyMark, SampleTag, StatusPill } from "@/components/jobs/job-parts";
import { LinkTabs } from "@/components/jobs/link-tabs";
import { Button } from "@/components/ui/button";
import { matchJob } from "@/lib/ai/matching";
import { requireProfile } from "@/lib/auth";
import { getCatalog } from "@/lib/data/catalog";
import { loadCareerProfile } from "@/lib/data/profile";
import { APPLICATION_STATUS_LABELS, JOB_TYPE_LABELS, formatDate, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Application Tracker" };

const TABS: (ApplicationStatus | "all")[] = [
  "all",
  "saved",
  "applied",
  "viewed",
  "screening",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const profile = await requireProfile({ role: "seeker" });
  const { status: statusParam } = await searchParams;
  const filter = TABS.includes(statusParam as ApplicationStatus) ? (statusParam as ApplicationStatus | "all") : "all";
  const supabase = await createClient();

  const [catalog, data, appsResult, invitesResult] = await Promise.all([
    getCatalog(),
    loadCareerProfile(profile.id),
    supabase
      .from("applications")
      .select(
        "id, status, updated_at, submitted_at, created_at, job:jobs(id, title, location, job_type, required_skills, preferred_skills, career_id, grad_years, company:companies(name, slug, is_sample))",
      )
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("invitations")
      .select("id, kind, message, created_at, job:jobs(id, title, location, job_type, company:companies(name, is_sample))")
      .eq("candidate_id", profile.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);
  if (!data) redirect("/onboarding");

  const all = appsResult.data ?? [];
  const counts = new Map<string, number>([["all", all.length]]);
  for (const a of all) counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
  const rows = all
    .filter((a) => filter === "all" || a.status === filter)
    .map((a) => ({ ...a, match: a.job ? matchJob(data, catalog, a.job) : null }));
  const invitations = (invitesResult.data ?? []).filter((i) => i.job);

  const active = all.filter((a) => ["applied", "viewed", "screening", "interview"].includes(a.status)).length;
  const stats = [
    { label: "Active applications", value: active, icon: Send },
    { label: "Interviews", value: counts.get("interview") ?? 0, icon: CalendarCheck },
    { label: "Offers", value: counts.get("offer") ?? 0, icon: Trophy },
    { label: "Saved jobs", value: counts.get("saved") ?? 0, icon: Briefcase },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<ForYouLabel>Your Applications</ForYouLabel>}
        title="Application Tracker"
        description="Every job you've saved or applied for, and exactly where each one stands."
        actions={
          <Button asChild>
            <Link href="/jobs">
              Find opportunities
              <ArrowRight />
            </Link>
          </Button>
        }
        className="mb-0"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-300">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {invitations.length > 0 && (
        <section id="invitations" aria-labelledby="invitations-heading" className="scroll-mt-24 space-y-3">
          <h2 id="invitations-heading" className="flex items-center gap-2 text-lg font-semibold">
            <Mail className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            Invitations
            <span className="rounded-full bg-violet-500/15 px-2 text-sm text-violet-700 dark:text-violet-300">{invitations.length}</span>
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="space-y-3 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
                <div className="flex items-start gap-3">
                  <CompanyMark name={inv.job!.company?.name} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {inv.job!.company?.name ?? "A company"} invited you to {inv.kind === "interview" ? "interview" : "apply"}
                    </p>
                    <Link href={`/jobs/${inv.job!.id}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                      {inv.job!.title} · {JOB_TYPE_LABELS[inv.job!.job_type]}
                      {inv.job!.location ? ` · ${inv.job!.location}` : ""}
                    </Link>
                    {inv.message && <p className="mt-2 rounded-lg bg-background/70 p-2 text-sm italic">“{inv.message}”</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{timeAgo(inv.created_at)}</p>
                  </div>
                </div>
                <InvitationActions invitationId={inv.id} kind={inv.kind} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Applications" className="space-y-4">
        <LinkTabs
          label="Filter by status"
          tabs={TABS.map((t) => ({
            href: t === "all" ? "/applications" : `/applications?status=${t}`,
            label: t === "all" ? "All" : APPLICATION_STATUS_LABELS[t],
            count: counts.get(t) ?? 0,
            active: filter === t,
          }))}
        />

        {all.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No applications yet"
            description="Save jobs you like and apply when you're ready. Everything you do shows up here with its full timeline."
            action={
              <Button asChild>
                <Link href="/jobs">Explore jobs matched to you</Link>
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={`No ${filter === "all" ? "" : APPLICATION_STATUS_LABELS[filter as ApplicationStatus].toLowerCase()} applications`}
            description="Nothing in this stage right now."
            action={
              <Button asChild variant="outline">
                <Link href="/applications">Show all</Link>
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Company</th>
                    <th scope="col" className="px-4 py-3 font-medium">Position</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 font-medium">Last update</th>
                    <th scope="col" className="px-4 py-3 font-medium">Match</th>
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((a) => (
                    <tr key={a.id} className="group relative transition-colors hover:bg-accent/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CompanyMark name={a.job?.company?.name} className="h-9 w-9 text-xs" />
                          <span className="font-medium">{a.job?.company?.name ?? "Listing closed"}</span>
                          {a.job?.company?.is_sample && <SampleTag />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/applications/${a.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                          {a.job?.title ?? "This listing is no longer available"}
                        </Link>
                        {a.job && <p className="text-xs text-muted-foreground">{JOB_TYPE_LABELS[a.job.job_type]}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={a.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <time dateTime={a.updated_at} title={formatDate(a.updated_at)}>
                          {timeAgo(a.updated_at)}
                        </time>
                      </td>
                      <td className="px-4 py-3">{a.match ? <MatchBadge score={a.match.score} label="" /> : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="space-y-3 md:hidden">
              {rows.map((a) => (
                <li key={a.id}>
                  <Link href={`/applications/${a.id}`} className="flex items-start gap-3 rounded-xl border bg-card p-4 active:bg-accent/40">
                    <CompanyMark name={a.job?.company?.name} className="h-10 w-10" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium leading-snug">{a.job?.title ?? "This listing is no longer available"}</p>
                      <p className="text-sm text-muted-foreground">{a.job?.company?.name ?? "Listing closed"}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <StatusPill status={a.status} />
                        {a.match && <MatchBadge score={a.match.score} />}
                        <span className="text-xs text-muted-foreground">{timeAgo(a.updated_at)}</span>
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
