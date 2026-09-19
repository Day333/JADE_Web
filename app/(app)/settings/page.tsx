import { APP_NAME } from "@/lib/config";
import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronRight, Eye, UserRound } from "lucide-react";
import { PageHeader } from "@/components/app/page-parts";
import { AccountForm, PrivacySettingsForm, SignOutButton, type DmPolicy } from "@/components/profile/settings-form";
import { requireProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Privacy & settings" };

export default async function SettingsPage() {
  const profile = await requireProfile();
  const isSeeker = profile.role === "seeker";

  const shortcuts = [
    ...(isSeeker
      ? [{ href: "/profile", icon: UserRound, label: "Edit my Career Profile", description: "Education, experience, projects, skills and resume" }]
      : [{ href: "/employer/company", icon: Building2, label: "Company settings", description: "Your company page and details" }]),
    { href: `/u/${profile.id}`, icon: Eye, label: "View my public profile", description: "See what other people see" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Privacy & settings"
        description={
          isSeeker
            ? "Control who can see your Career Profile, who can contact you, and your account details."
            : "Your account details and who can message you."
        }
      />
      <div className="space-y-6">
        <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="account-title">
          <h2 id="account-title" className="mb-4 font-semibold">
            Account
          </h2>
          <AccountForm fullName={profile.full_name ?? ""} headline={profile.headline ?? ""} showHeadline={!isSeeker} />
        </section>

        <PrivacySettingsForm
          isSeeker={isSeeker}
          initial={{
            profile_public: profile.profile_public,
            resume_public: profile.resume_public,
            goal_public: profile.goal_public,
            open_to_opportunities: profile.open_to_opportunities,
            allow_recruiter_contact: profile.allow_recruiter_contact,
            show_status_to_recruiters: profile.show_status_to_recruiters,
            dm_policy: profile.dm_policy as DmPolicy,
          }}
        />

        <nav aria-label="Profile shortcuts" className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <ul className="divide-y">
            {shortcuts.map(({ href, icon: Icon, label, description }) => (
              <li key={href}>
                <Link href={href} className="flex items-center gap-3 p-4 transition-colors hover:bg-accent/50 sm:px-6">
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-sm text-muted-foreground">{description}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-semibold">Sign out</h2>
            <p className="text-sm text-muted-foreground">Sign out of {APP_NAME} on this device.</p>
          </div>
          <SignOutButton />
        </section>
      </div>
    </div>
  );
}
