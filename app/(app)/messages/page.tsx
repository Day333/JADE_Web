import Link from "next/link";
import { Briefcase, MessagesSquare, UserSearch, Users } from "lucide-react";
import { loadConversations } from "@/components/messages/data";
import { MessagesShell } from "@/components/messages/messages-shell";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const profile = await requireProfile();
  const conversations = await loadConversations(profile.id);
  const recruiter = profile.role === "recruiter";

  return (
    <MessagesShell conversations={conversations} userId={profile.id}>
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-sm">
          <MessagesSquare className="h-8 w-8" aria-hidden />
        </span>
        <h2 className="text-xl font-semibold">{conversations.length > 0 ? "Pick a conversation" : "Start a conversation"}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {recruiter
            ? "Message candidates from their profile or from your job's candidate list. Chats started from a job keep the role attached so both sides have context."
            : "Reach out to people a few steps ahead of you, classmates from your university, or recruiters about a role. Use Message on a profile, a community post or a job page."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/community">
              <Users /> Find people in Community
            </Link>
          </Button>
          {recruiter ? (
            <Button variant="outline" asChild>
              <Link href="/employer/discover">
                <UserSearch /> Discover talent
              </Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/jobs">
                <Briefcase /> Browse jobs
              </Link>
            </Button>
          )}
        </div>
      </div>
    </MessagesShell>
  );
}
