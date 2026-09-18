import { Inbox } from "lucide-react";
import { ConversationList } from "@/components/messages/conversation-list";
import type { ConversationSummary } from "@/components/messages/data";
import { cn } from "@/lib/utils";

/**
 * Two-pane messaging layout: conversation list on the left, the open
 * conversation on the right. On phones only one pane shows at a time.
 */
export function MessagesShell({
  conversations,
  userId,
  activeId,
  children,
}: {
  conversations: ConversationSummary[];
  userId: string;
  activeId?: string;
  children: React.ReactNode;
}) {
  const unread = conversations.filter((c) => c.unread).length;
  return (
    <div className="grid h-[calc(100dvh-8rem)] min-h-[28rem] grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section
        aria-label="Conversations"
        className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card", activeId && "hidden lg:flex")}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h1 className="text-lg font-semibold">Messages</h1>
          {unread > 0 && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {unread} unread
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
              <span className="mb-3 rounded-full bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                <Inbox className="h-6 w-6" aria-hidden />
              </span>
              <p className="font-medium">No conversations yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tap <span className="font-medium text-foreground">Message</span> on someone&apos;s profile, a community post or a job
                page to start one.
              </p>
            </div>
          ) : (
            <ConversationList initial={conversations} userId={userId} activeId={activeId} />
          )}
        </div>
      </section>
      <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card", !activeId && "hidden lg:flex")}>
        {children}
      </section>
    </div>
  );
}
