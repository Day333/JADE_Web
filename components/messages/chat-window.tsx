"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { FileText, FolderGit2, Globe, Loader2, Paperclip, Send, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/app/user-avatar";
import { AttachmentCard, isAttachment } from "@/components/messages/attachment-card";
import { subscribeToInserts } from "@/components/messages/realtime";
import { clockTime, dayKey, dayLabel, useTimeZone } from "@/components/messages/time";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markConversationRead, sendMessage, type AttachmentRef } from "@/lib/actions/messages";
import { cn } from "@/lib/utils";
import type { Message, MessageAttachment } from "@/lib/types";

export interface Shareables {
  resumes: { id: string; label: string }[];
  portfolio: { id: string; label: string }[];
  projects: { id: string; label: string }[];
  resumePublic: boolean;
}

type ChatMessage = Message & { pending?: boolean };

interface Staged {
  ref: AttachmentRef;
  preview: MessageAttachment;
}

function ShareMenu({ shareables, onPick, userId }: { shareables: Shareables; onPick: (s: Staged) => void; userId: string }) {
  const pick = (type: MessageAttachment["type"], id: string, label: string) =>
    onPick({ ref: { type, id }, preview: { type, id, label } });
  const empty = (text: string, href: string, cta: string) => (
    <div className="px-2 py-1.5 text-xs text-muted-foreground">
      {text}{" "}
      <Link href={href} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
        {cta}
      </Link>
    </div>
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label="Share resume, portfolio, project or profile">
          <Paperclip className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-60">
        <DropdownMenuLabel>Share with this person</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FileText className="h-4 w-4" /> Resume
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-64">
              {shareables.resumes.length === 0
                ? empty("No resume uploaded yet.", "/profile", "Upload one")
                : shareables.resumes.map((r) => (
                    <DropdownMenuItem key={r.id} onSelect={() => pick("resume", r.id, r.label)}>
                      <FileText className="h-4 w-4" /> <span className="truncate">{r.label}</span>
                    </DropdownMenuItem>
                  ))}
              {shareables.resumes.length > 0 && !shareables.resumePublic && (
                <p className="px-2 pb-1.5 pt-1 text-[11px] leading-snug text-muted-foreground">
                  Your resume is private: they can open it only if you applied to their job or make it visible in{" "}
                  <Link href="/settings" className="underline">
                    settings
                  </Link>
                  .
                </p>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Globe className="h-4 w-4" /> Portfolio
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-64">
              {shareables.portfolio.length === 0
                ? empty("No portfolio links yet.", "/profile", "Add links")
                : shareables.portfolio.map((p) => (
                    <DropdownMenuItem key={p.id} onSelect={() => pick("portfolio", p.id, p.label)}>
                      <Globe className="h-4 w-4" /> <span className="truncate">{p.label}</span>
                    </DropdownMenuItem>
                  ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FolderGit2 className="h-4 w-4" /> Project
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="w-64">
              {shareables.projects.length === 0
                ? empty("No projects yet.", "/profile", "Add a project")
                : shareables.projects.map((p) => (
                    <DropdownMenuItem key={p.id} onSelect={() => pick("project", p.id, p.label)}>
                      <FolderGit2 className="h-4 w-4" /> <span className="truncate">{p.label}</span>
                    </DropdownMenuItem>
                  ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={() => pick("profile", userId, "My Career Profile")}>
          <UserRound className="h-4 w-4" /> Career Profile
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ChatWindow({
  conversationId,
  me,
  other,
  initialMessages,
  shareables,
}: {
  conversationId: string;
  me: { id: string; full_name: string | null };
  other: { id: string; full_name: string | null } | null;
  initialMessages: Message[];
  shareables: Shareables;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [staged, setStaged] = useState<Staged | null>(null);
  const [, startTransition] = useTransition();
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const timeZone = useTimeZone();

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  // Realtime: new messages in this conversation (RLS limits events to members).
  useEffect(
    () =>
      subscribeToInserts<Message>(`chat-${conversationId}`, "messages", `conversation_id=eq.${conversationId}`, (msg) => {
        addMessage(msg);
        if (msg.sender_id !== me.id) void markConversationRead(conversationId);
      }),
    [conversationId, me.id, addMessage],
  );

  // Keep the newest message in view unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Grow the composer with its content (up to ~6 lines).
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [body]);

  const send = () => {
    const text = body.trim();
    if ((!text && !staged) || sending) return;
    const tempId = `temp-${Date.now()}`;
    const attachment = staged;
    const optimistic: ChatMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: me.id,
      body: text,
      attachment: attachment ? (attachment.preview as never) : null,
      created_at: new Date().toISOString(),
      pending: true,
    };
    stickToBottom.current = true;
    setMessages((prev) => [...prev, optimistic]);
    setBody("");
    setStaged(null);
    setSending(true);
    startTransition(async () => {
      const result = await sendMessage(conversationId, text, attachment?.ref ?? null);
      setSending(false);
      if (result.error || !result.message) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setBody(text);
        setStaged(attachment);
        toast.error(result.error ?? "Your message could not be sent.");
        return;
      }
      const saved = result.message;
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        return withoutTemp.some((m) => m.id === saved.id) ? withoutTemp : [...withoutTemp, saved];
      });
      textareaRef.current?.focus();
    });
  };

  const sorted = [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5"
        aria-live="polite"
      >
        {sorted.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <UserAvatar name={other?.full_name} seed={other?.id ?? conversationId} size="lg" />
            <p className="mt-3 font-medium">Start your conversation with {other?.full_name ?? "this member"}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Introduce yourself and say why you&apos;re reaching out. You can also share your resume, portfolio, a project or your
              Career Profile with the paperclip.
            </p>
          </div>
        ) : (
          <ol className="space-y-1">
            {sorted.map((m, i) => {
              const prev = sorted[i - 1];
              const next = sorted[i + 1];
              const mine = m.sender_id === me.id;
              const newDay = !prev || dayKey(prev.created_at, timeZone) !== dayKey(m.created_at, timeZone);
              const firstOfGroup = newDay || !prev || prev.sender_id !== m.sender_id;
              const lastOfGroup =
                !next || next.sender_id !== m.sender_id || dayKey(next.created_at, timeZone) !== dayKey(m.created_at, timeZone);
              const attachment = isAttachment(m.attachment) ? m.attachment : null;
              return (
                <Fragment key={m.id}>
                  {newDay && (
                    <li className="flex justify-center py-3" aria-hidden>
                      <span className="rounded-full bg-muted px-3 py-0.5 text-xs text-muted-foreground" suppressHydrationWarning>
                        {dayLabel(m.created_at, timeZone)}
                      </span>
                    </li>
                  )}
                  <li className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start", firstOfGroup && "pt-2")}>
                    {!mine && (
                      <span className="w-7 shrink-0">
                        {lastOfGroup && <UserAvatar name={other?.full_name} seed={other?.id ?? m.sender_id} size="xs" className="h-7 w-7" />}
                      </span>
                    )}
                    <div className={cn("flex max-w-[82%] flex-col gap-1 sm:max-w-[70%]", mine ? "items-end" : "items-start")}>
                      {(m.body || attachment) && (
                        <div
                          className={cn(
                            "rounded-2xl text-sm shadow-sm",
                            m.body ? "px-3.5 py-2" : "p-1.5",
                            mine ? "bg-emerald-600 text-white dark:bg-emerald-600" : "bg-muted text-foreground",
                            mine ? (lastOfGroup ? "rounded-br-md" : "") : lastOfGroup ? "rounded-bl-md" : "",
                            m.pending && "opacity-70",
                          )}
                        >
                          {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                          {attachment && <AttachmentCard attachment={attachment} mine={mine} className={cn(m.body && "mt-2")} />}
                        </div>
                      )}
                      {lastOfGroup && (
                        <span className="px-1 text-[11px] text-muted-foreground" suppressHydrationWarning>
                          {m.pending ? "Sending…" : clockTime(m.created_at, timeZone)}
                        </span>
                      )}
                    </div>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        )}
      </div>

      <div className="border-t bg-card p-2 sm:p-3">
        {staged && (
          <div className="mb-2 flex items-center gap-2 px-1">
            <AttachmentCard attachment={staged.preview} mine={false} className="pointer-events-none w-auto flex-1 sm:max-w-sm" />
            <Button type="button" variant="ghost" size="icon" aria-label="Remove attachment" onClick={() => setStaged(null)}>
              <X />
            </Button>
          </div>
        )}
        <form
          className="flex items-end gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <ShareMenu shareables={shareables} userId={me.id} onPick={(s) => {
            setStaged(s);
            textareaRef.current?.focus();
          }} />
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={5000}
            placeholder={staged ? "Add a message (optional)…" : "Write a message…"}
            aria-label="Message"
            className="max-h-40 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-base leading-6 shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
          />
          <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl" disabled={sending || (!body.trim() && !staged)} aria-label="Send message">
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
        <p className="mt-1 hidden px-12 text-[11px] text-muted-foreground sm:block">Enter to send · Shift + Enter for a new line</p>
      </div>
    </div>
  );
}
