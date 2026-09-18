import { PageHeader } from "@/components/app/page-parts";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NotificationList, type NotificationView } from "./notification-list";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(id, full_name)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(150);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description={
          profile.role === "recruiter"
            ? "Applications, candidate messages and responses to your invitations."
            : "Activity on your posts, messages, application updates and opportunities matched to your goal."
        }
      />
      {error ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Your notifications could not be loaded. Please refresh the page.
        </p>
      ) : (
        <NotificationList initial={(data ?? []) as unknown as NotificationView[]} userId={profile.id} role={profile.role} />
      )}
    </div>
  );
}
