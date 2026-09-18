"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Bell, LogOut, Menu, MessageSquare, Moon, Settings, Sun, User } from "lucide-react";
import { UserAvatar } from "@/components/app/user-avatar";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  /** Extra path prefixes that should highlight this item */
  match?: string[];
  exact?: boolean;
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return [item.href, ...(item.match ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function NavLinks({ items, className, onNavigate }: { items: NavItem[]; className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className={cn("items-center gap-1", className)}>
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
              active ? "bg-accent text-foreground" : "text-muted-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="text-left">
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <NavLinks items={items} className="mt-6 flex flex-col items-stretch" onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Message and notification icons with unread counts kept live via Supabase Realtime. */
export function LiveBadges({ userId, initial }: { userId: string; initial: { notifications: number; messages: number } }) {
  const [counts, setCounts] = useState(initial);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const [notifications, memberships] = await Promise.all([
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
      supabase.from("conversation_members").select("last_read_at, conversations(last_message_at)").eq("user_id", userId),
    ]);
    const messages = (memberships.data ?? []).filter(
      (m) => m.conversations && new Date(m.conversations.last_message_at) > new Date(m.last_read_at),
    ).length;
    setCounts({ notifications: notifications.count ?? 0, messages });
  }, [userId]);

  // Counts change when the user reads things, so re-check on navigation.
  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    void (async () => {
      // Authenticate the socket before joining, otherwise the channel runs as
      // anon and RLS filters out every event.
      try {
        await supabase.realtime.setAuth();
      } catch {
        return;
      }
      if (cancelled) return;
      channel = supabase
        // Unique name: supabase-js reuses channels by name and strict mode mounts twice.
        .channel(`badges-${userId}-${Math.random().toString(36).slice(2, 10)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
          void refresh();
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
          void refresh();
        })
        .subscribe();
    })();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return (
    <>
      <Link href="/messages" className="relative rounded-md p-2 hover:bg-accent" aria-label={`Messages (${counts.messages} unread)`}>
        <MessageSquare className="h-5 w-5" />
        <CountBadge count={counts.messages} />
      </Link>
      <Link
        href="/notifications"
        className="relative rounded-md p-2 hover:bg-accent"
        aria-label={`Notifications (${counts.notifications} unread)`}
      >
        <Bell className="h-5 w-5" />
        <CountBadge count={counts.notifications} />
      </Link>
    </>
  );
}

export function UserMenu({
  name,
  userId,
  role,
  onboarded,
}: {
  name: string | null;
  userId: string;
  role: UserRole;
  onboarded: boolean;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
        <UserAvatar name={name} seed={userId} size="sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{name ?? "Your account"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onboarded && role === "seeker" && (
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User className="h-4 w-4" /> My Career Profile
            </Link>
          </DropdownMenuItem>
        )}
        {onboarded && (
          <DropdownMenuItem asChild>
            <Link href={`/u/${userId}`}>
              <User className="h-4 w-4" /> Public profile
            </Link>
          </DropdownMenuItem>
        )}
        {onboarded && role === "recruiter" && (
          <DropdownMenuItem asChild>
            <Link href="/employer/company">
              <Settings className="h-4 w-4" /> Company settings
            </Link>
          </DropdownMenuItem>
        )}
        {onboarded && (
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4" /> Privacy &amp; settings
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
