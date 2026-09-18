"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  Briefcase,
  CalendarCheck,
  CheckCheck,
  ClipboardList,
  Handshake,
  Heart,
  ListChecks,
  MessageCircle,
  MessageSquare,
  Route,
  Send,
  Sparkles,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/app/user-avatar";
import { subscribeToInserts } from "@/components/messages/realtime";
import { dayKey, RelativeTime, useTimeZone } from "@/components/messages/time";
import { Button } from "@/components/ui/button";
import { deleteNotification, markAllNotificationsRead, markNotificationRead } from "@/lib/actions/messages";
import { cn } from "@/lib/utils";
import type { Notification, UserRole } from "@/lib/types";

export type NotificationView = Notification & { actor: { id: string; full_name: string | null } | null };

const KINDS: Record<string, { icon: LucideIcon; tone: string; label: string }> = {
  post_like: { icon: Heart, tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400", label: "Like" },
  post_comment: { icon: MessageCircle, tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400", label: "Comment" },
  new_follower: { icon: UserPlus, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", label: "New follower" },
  message: { icon: MessageSquare, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", label: "Message" },
  recruiter_reply: { icon: Briefcase, tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400", label: "Recruiter message" },
  new_application: { icon: ClipboardList, tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400", label: "New application" },
  application_status: { icon: ListChecks, tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400", label: "Application update" },
  apply_invite: { icon: Send, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", label: "Invitation to apply" },
  interview_invite: { icon: CalendarCheck, tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400", label: "Interview invitation" },
  invitation_response: { icon: Handshake, tone: "bg-teal-500/15 text-teal-600 dark:text-teal-400", label: "Invitation response" },
  job_recommendation: { icon: Sparkles, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", label: "Job for you" },
  roadmap_task: { icon: Route, tone: "bg-teal-500/15 text-teal-600 dark:text-teal-400", label: "Roadmap" },
};
const DEFAULT_KIND = { icon: Bell, tone: "bg-muted text-muted-foreground", label: "Update" };

/** Where a notification leads when it has no explicit link. */
function destination(n: NotificationView, role: UserRole) {
  if (n.link && n.link.startsWith("/")) return n.link;
  switch (n.kind) {
    case "post_like":
    case "post_comment":
      return "/community";
    case "new_follower":
      return n.actor_id ? `/u/${n.actor_id}` : "/community";
    case "message":
    case "recruiter_reply":
      return "/messages";
    case "new_application":
    case "invitation_response":
      return "/employer";
    case "application_status":
    case "apply_invite":
    case "interview_invite":
      return "/applications";
    case "job_recommendation":
      return "/jobs";
    case "roadmap_task":
      return "/roadmap";
    default:
      return role === "recruiter" ? "/employer" : "/dashboard";
  }
}

export function NotificationList({ initial, userId, role }: { initial: NotificationView[]; userId: string; role: UserRole }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [, startTransition] = useTransition();
  const router = useRouter();
  const timeZone = useTimeZone();

  useEffect(() => setItems(initial), [initial]);

  // New notifications appear without a reload.
  useEffect(
    () => subscribeToInserts(`notifications-page-${userId}`, "notifications", `user_id=eq.${userId}`, () => router.refresh()),
    [userId, router],
  );

  const unreadCount = items.filter((n) => !n.is_read).length;
  const visible = filter === "unread" ? items.filter((n) => !n.is_read) : items;
  const groups = useMemo(() => {
    const today = dayKey(new Date().toISOString(), timeZone);
    return [
      { label: "Today", items: visible.filter((n) => dayKey(n.created_at, timeZone) === today) },
      { label: "Earlier", items: visible.filter((n) => dayKey(n.created_at, timeZone) !== today) },
    ].filter((g) => g.items.length > 0);
  }, [visible, timeZone]);

  const open = (n: NotificationView) => {
    const href = destination(n, role);
    if (!n.is_read) setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    startTransition(async () => {
      if (!n.is_read) {
        const result = await markNotificationRead(n.id);
        if (result.error) toast.error(result.error);
      }
      router.push(href);
    });
  };

  const markAll = () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.error) toast.error(result.error);
      else toast.success("All caught up");
    });
  };

  const remove = (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    startTransition(async () => {
      const result = await deleteNotification(id);
      if (result.error) toast.error(result.error);
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter notifications" className="inline-flex rounded-lg bg-muted p-1">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium text-muted-foreground",
                filter === f && "bg-background text-foreground shadow",
              )}
            >
              {f === "all" ? "All" : `Unread${unreadCount ? ` (${unreadCount})` : ""}`}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={markAll} disabled={unreadCount === 0}>
          <CheckCheck /> Mark all as read
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
          <span className="mb-3 rounded-full bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
            <BellOff className="h-6 w-6" aria-hidden />
          </span>
          <p className="font-medium">{filter === "unread" ? "You're all caught up" : "No notifications yet"}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {role === "recruiter"
              ? "New applications, candidate replies and invitation responses will show up here."
              : "Likes, comments, new followers, messages from recruiters, application updates and new jobs for your goal will show up here."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground" suppressHydrationWarning>
                {group.label}
              </h2>
              <ul className="overflow-hidden rounded-xl border bg-card">
                {group.items.map((n) => {
                  const kind = KINDS[n.kind] ?? DEFAULT_KIND;
                  const Icon = kind.icon;
                  return (
                    <li key={n.id} className={cn("group relative border-b last:border-b-0", !n.is_read && "bg-emerald-500/[0.06]")}>
                      <button
                        type="button"
                        onClick={() => open(n)}
                        className="flex w-full items-start gap-3 px-4 py-3.5 pr-12 text-left transition-colors hover:bg-accent/60"
                      >
                        <span className="relative shrink-0">
                          {n.actor ? (
                            <>
                              <UserAvatar name={n.actor.full_name} seed={n.actor.id} size="md" />
                              <span className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-card ring-2 ring-card">
                                <span className={cn("flex h-full w-full items-center justify-center rounded-full", kind.tone)}>
                                  <Icon className="h-3 w-3" aria-hidden />
                                </span>
                              </span>
                            </>
                          ) : (
                            <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", kind.tone)}>
                              <Icon className="h-5 w-5" aria-hidden />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block text-sm", n.is_read ? "text-foreground/90" : "font-semibold")}>{n.title}</span>
                          {n.body && <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{n.body}</span>}
                          <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{kind.label}</span>
                            <span aria-hidden>·</span>
                            <RelativeTime iso={n.created_at} />
                          </span>
                        </span>
                        {!n.is_read && (
                          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500">
                            <span className="sr-only">Unread</span>
                          </span>
                        )}
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2.5 h-8 w-8 text-muted-foreground opacity-100 hover:text-destructive sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                        aria-label="Delete notification"
                        onClick={() => remove(n.id)}
                      >
                        <X />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
