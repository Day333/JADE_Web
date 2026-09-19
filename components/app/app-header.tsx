import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { LiveBadges, MobileNav, NavLinks, UserMenu, type NavItem } from "@/components/app/nav";
import { Input } from "@/components/ui/input";
import { getMyProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const SEEKER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home" },
  { href: "/careers", label: "Careers", match: ["/careers", "/skill-gap", "/roadmap", "/plan"] },
  { href: "/community", label: "Community", match: ["/community", "/journey"] },
  { href: "/jobs", label: "Jobs" },
  { href: "/practice", label: "Practice" },
  { href: "/progress", label: "Progress" },
  { href: "/applications", label: "Applications" },
];

const RECRUITER_NAV: NavItem[] = [
  { href: "/employer", label: "Dashboard", exact: true },
  { href: "/employer/jobs/new", label: "Post a Job" },
  { href: "/employer/discover", label: "Discover Talent" },
  { href: "/community", label: "Community" },
];

async function unreadCounts(userId: string) {
  const supabase = await createClient();
  const [notifications, memberships] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
    supabase.from("conversation_members").select("last_read_at, conversations(last_message_at)").eq("user_id", userId),
  ]);
  const messages = (memberships.data ?? []).filter(
    (m) => m.conversations && new Date(m.conversations.last_message_at) > new Date(m.last_read_at),
  ).length;
  return { notifications: notifications.count ?? 0, messages };
}

export async function AppHeader() {
  const profile = await getMyProfile();
  if (!profile) return null;
  const onboarded = profile.onboarding_step === "done";
  const nav = !onboarded ? [] : profile.role === "recruiter" ? RECRUITER_NAV : SEEKER_NAV;
  const counts = onboarded ? await unreadCounts(profile.id) : { notifications: 0, messages: 0 };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {nav.length > 0 && <MobileNav items={nav} />}
        {/* The full name does not fit next to the icons on narrow phones. */}
        <Logo
          href={onboarded ? (profile.role === "recruiter" ? "/employer" : "/dashboard") : "/"}
          wordmarkClassName="max-[480px]:hidden"
        />
        {nav.length > 0 && <NavLinks items={nav} className="ml-4 hidden lg:flex" />}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {onboarded && (
            <form action="/search" className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                type="search"
                placeholder="Search jobs, careers, people…"
                aria-label="Search"
                className="h-9 w-56 pl-8 xl:w-72"
              />
            </form>
          )}
          {onboarded && (
            <Link href="/search" className="rounded-md p-2 hover:bg-accent md:hidden" aria-label="Search">
              <Search className="h-5 w-5" />
            </Link>
          )}
          {onboarded && <LiveBadges userId={profile.id} initial={counts} />}
          <UserMenu
            name={profile.full_name}
            userId={profile.id}
            role={profile.role}
            onboarded={onboarded}
          />
        </div>
      </div>
    </header>
  );
}
