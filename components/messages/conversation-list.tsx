"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Paperclip } from "lucide-react";
import { UserAvatar } from "@/components/app/user-avatar";
import type { ConversationSummary } from "@/components/messages/data";
import { subscribeToInserts } from "@/components/messages/realtime";
import { RelativeTime } from "@/components/messages/time";
import { cn } from "@/lib/utils";
import type { Message, MessageAttachment } from "@/lib/types";

function preview(c: ConversationSummary, userId: string) {
  if (!c.lastMessage) return "No messages yet — say hello";
  const prefix = c.lastMessage.senderId === userId ? "You: " : "";
  if (c.lastMessage.body) return prefix + c.lastMessage.body.replace(/\s+/g, " ");
  if (c.lastMessage.attachment) return `${prefix}Shared ${c.lastMessage.attachment.label}`;
  return prefix;
}

/** Conversation list that stays current via Supabase Realtime. */
export function ConversationList({
  initial,
  userId,
  activeId,
}: {
  initial: ConversationSummary[];
  userId: string;
  activeId?: string;
}) {
  const [conversations, setConversations] = useState(initial);
  const router = useRouter();
  const known = useRef(new Set(initial.map((c) => c.id)));
  const activeRef = useRef(activeId);

  useEffect(() => {
    activeRef.current = activeId;
    if (activeId) setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, unread: false } : c)));
  }, [activeId]);

  useEffect(() => {
    setConversations(initial);
    known.current = new Set(initial.map((c) => c.id));
  }, [initial]);

  useEffect(
    () =>
      subscribeToInserts<Message>(`conversation-list-${userId}`, "messages", null, (msg) => {
        if (!known.current.has(msg.conversation_id)) {
          router.refresh();
          return;
        }
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === msg.conversation_id
              ? {
                  ...c,
                  lastMessage: {
                    body: msg.body,
                    attachment: (msg.attachment as unknown as MessageAttachment | null) ?? null,
                    senderId: msg.sender_id,
                    createdAt: msg.created_at,
                  },
                  lastMessageAt: msg.created_at,
                  unread: msg.sender_id !== userId && activeRef.current !== msg.conversation_id,
                }
              : c,
          );
          return updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        });
      }),
    [userId, router],
  );

  return (
    <ul className="divide-y">
      {conversations.map((c) => {
        const active = c.id === activeId;
        const name = c.other?.full_name ?? "Former member";
        return (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex gap-3 px-4 py-3 transition-colors hover:bg-accent/60",
                active && "bg-emerald-500/10 hover:bg-emerald-500/10",
              )}
            >
              <span className="relative">
                <UserAvatar name={c.other?.full_name} seed={c.other?.id ?? c.id} size="md" />
                {c.unread && (
                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className={cn("truncate text-sm", c.unread ? "font-semibold" : "font-medium")}>{name}</span>
                  {c.other?.role === "recruiter" && (
                    <span className="shrink-0 rounded bg-sky-500/10 px-1 py-px text-[10px] font-semibold uppercase text-sky-700 dark:text-sky-300">
                      Recruiter
                    </span>
                  )}
                  <RelativeTime iso={c.lastMessageAt} className="ml-auto shrink-0 text-xs text-muted-foreground" />
                </span>
                {c.job ? (
                  <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-emerald-700 dark:text-emerald-400">
                    <Briefcase className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">
                      About: {c.job.title}
                      {c.job.companyName ? ` · ${c.job.companyName}` : ""}
                    </span>
                  </span>
                ) : (
                  c.other?.headline && <span className="block truncate text-xs text-muted-foreground">{c.other.headline}</span>
                )}
                <span
                  className={cn(
                    "mt-0.5 flex items-center gap-1 truncate text-sm",
                    c.unread ? "font-medium text-foreground" : "text-muted-foreground",
                  )}
                >
                  {!c.lastMessage?.body && c.lastMessage?.attachment && <Paperclip className="h-3 w-3 shrink-0" aria-hidden />}
                  <span className="truncate">{preview(c, userId)}</span>
                </span>
              </span>
              {c.unread && <span className="sr-only">Unread</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
