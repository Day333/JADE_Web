import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Briefcase, ExternalLink, UserSearch } from "lucide-react";
import { UserAvatar } from "@/components/app/user-avatar";
import { InviteActions } from "@/components/employer/invite-actions";
import { ChatWindow, type Shareables } from "@/components/messages/chat-window";
import { loadConversation, loadConversations } from "@/components/messages/data";
import { MessagesShell } from "@/components/messages/messages-shell";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata = { title: "Messages" };

async function loadShareables(userId: string, profile: { github_url: string | null; linkedin_url: string | null; website_url: string | null; resume_public: boolean }): Promise<Shareables> {
  const supabase = await createClient();
  const [resumes, portfolio, projects] = await Promise.all([
    supabase.from("resumes").select("id, file_name").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("portfolio_items").select("id, title").eq("user_id", userId).order("created_at"),
    supabase.from("projects").select("id, name").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  const links = [
    profile.github_url && { id: "github", label: "GitHub" },
    profile.website_url && { id: "website", label: "Website" },
    profile.linkedin_url && { id: "linkedin", label: "LinkedIn" },
  ].filter(Boolean) as { id: string; label: string }[];
  return {
    resumes: (resumes.data ?? []).map((r) => ({ id: r.id, label: r.file_name })),
    portfolio: [...(portfolio.data ?? []).map((p) => ({ id: p.id, label: p.title })), ...links],
    projects: (projects.data ?? []).map((p) => ({ id: p.id, label: p.name })),
    resumePublic: profile.resume_public,
  };
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const conversation = await loadConversation(id, profile.id);
  if (!conversation) notFound();

  const supabase = await createClient();
  // Opening the conversation marks it read (before the list is loaded, so it shows as read).
  await supabase.rpc("mark_conversation_read", { p_conversation: id });

  const [conversations, messagesRes, shareables] = await Promise.all([
    loadConversations(profile.id),
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: false }).limit(300),
    loadShareables(profile.id, profile),
  ]);
  const messages = (messagesRes.data ?? []).reverse();

  const other = conversation.other;
  const job = conversation.job;
  const iAmRecruiter = profile.role === "recruiter";
  const otherIsRecruiter = other?.role === "recruiter";
  const jobId = conversation.jobId;

  return (
    <MessagesShell conversations={conversations} userId={profile.id} activeId={id}>
      <header className="border-b px-3 py-3 sm:px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="-ml-1 shrink-0 lg:hidden" asChild>
            <Link href="/messages" aria-label="Back to conversations">
              <ArrowLeft />
            </Link>
          </Button>
          {other ? (
            <Link href={`/u/${other.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <UserAvatar name={other.full_name} seed={other.id} size="md" />
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold hover:underline">{other.full_name ?? "Member"}</span>
                  {otherIsRecruiter && (
                    <span className="shrink-0 rounded bg-sky-500/10 px-1 py-px text-[10px] font-semibold uppercase text-sky-700 dark:text-sky-300">
                      Recruiter
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {otherIsRecruiter
                    ? [
                        (other.companyName ?? job?.companyName) ? `Recruiter at ${other.companyName ?? job?.companyName}` : "Recruiter",
                        job ? `Position: ${job.title}` : other.headline,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : other.headline ?? "Member"}
                </span>
              </span>
            </Link>
          ) : (
            <span className="flex-1 text-sm text-muted-foreground">This member has left JADE.</span>
          )}
          {other && (
            <Button variant="outline" size="sm" className="hidden shrink-0 sm:inline-flex" asChild>
              <Link href={`/u/${other.id}`}>View profile</Link>
            </Button>
          )}
        </div>

        {(job || (jobId && !job)) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-emerald-500/5 px-3 py-2">
            <p className="flex min-w-0 flex-1 basis-48 items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <span className="truncate">
                <span className="text-muted-foreground">About: </span>
                {job ? (
                  <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">
                    {job.title}
                    {job.companyName ? ` · ${job.companyName}` : ""}
                  </Link>
                ) : (
                  <span className="font-medium">a role that is no longer open</span>
                )}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {iAmRecruiter && other && jobId ? (
                <>
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/employer/candidates/${other.id}?job=${jobId}`}>
                      <UserSearch /> View candidate profile
                    </Link>
                  </Button>
                  <InviteActions candidateId={other.id} jobId={jobId} />
                </>
              ) : (
                job && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/jobs/${job.id}`}>
                      View job <ExternalLink />
                    </Link>
                  </Button>
                )
              )}
            </div>
          </div>
        )}
      </header>

      <ChatWindow
        key={id}
        conversationId={id}
        me={{ id: profile.id, full_name: profile.full_name }}
        other={other ? { id: other.id, full_name: other.full_name } : null}
        initialMessages={messages}
        shareables={shareables}
      />
    </MessagesShell>
  );
}
