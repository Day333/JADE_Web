"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import type { Message, MessageAttachment } from "@/lib/types";

async function requireUserId() {
  const userId = await getUserId();
  if (!userId) redirect("/auth/login");
  return userId;
}

export interface AttachmentRef {
  type: MessageAttachment["type"];
  /** Row id, or "github" / "linkedin" / "website" for profile links. */
  id: string;
}

function externalUrl(url: string | null | undefined) {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Builds the attachment on the server from something the sender owns. */
async function buildAttachment(userId: string, ref: AttachmentRef): Promise<MessageAttachment | null> {
  const supabase = await createClient();
  switch (ref.type) {
    case "resume": {
      const { data } = await supabase.from("resumes").select("id, file_name").eq("id", ref.id).eq("user_id", userId).maybeSingle();
      return data ? { type: "resume", id: data.id, label: data.file_name, url: `/resume/${data.id}` } : null;
    }
    case "project": {
      const { data } = await supabase.from("projects").select("id, name, url").eq("id", ref.id).eq("user_id", userId).maybeSingle();
      return data ? { type: "project", id: data.id, label: data.name, url: externalUrl(data.url) ?? `/u/${userId}#projects` } : null;
    }
    case "portfolio": {
      if (ref.id === "github" || ref.id === "linkedin" || ref.id === "website") {
        const { data } = await supabase.from("profiles").select("github_url, linkedin_url, website_url").eq("id", userId).single();
        const url = externalUrl(data?.[`${ref.id}_url` as "github_url" | "linkedin_url" | "website_url"]);
        const label = ref.id === "github" ? "GitHub" : ref.id === "linkedin" ? "LinkedIn" : "Website";
        return url ? { type: "portfolio", id: ref.id, label, url } : null;
      }
      const { data } = await supabase
        .from("portfolio_items")
        .select("id, title, url")
        .eq("id", ref.id)
        .eq("user_id", userId)
        .maybeSingle();
      return data ? { type: "portfolio", id: data.id, label: data.title, url: externalUrl(data.url) } : null;
    }
    case "profile": {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
      return { type: "profile", id: userId, label: data?.full_name ?? "My Career Profile", url: `/u/${userId}` };
    }
    default:
      return null;
  }
}

export async function sendMessage(
  conversationId: string,
  body: string,
  attachmentRef?: AttachmentRef | null,
): Promise<{ message?: Message; error?: string }> {
  const userId = await requireUserId();
  const text = (body ?? "").trim();
  if (text.length > 5000) return { error: "Messages can be up to 5,000 characters." };
  let attachment: MessageAttachment | null = null;
  if (attachmentRef) {
    attachment = await buildAttachment(userId, attachmentRef);
    if (!attachment) return { error: "That item is no longer available to share." };
  }
  if (!text && !attachment) return { error: "Write a message first." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      body: text,
      attachment: attachment as unknown as Json,
    })
    .select("*")
    .single();
  if (error || !data) return { error: "Your message could not be sent. You may no longer be part of this conversation." };
  revalidatePath("/messages");
  return { message: data };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await requireUserId();
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { p_conversation: conversationId });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function markNotificationRead(id: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", userId);
  if (error) return { error: "Could not update the notification." };
  revalidatePath("/notifications");
  return {};
}

export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  if (error) return { error: "Could not mark notifications as read." };
  revalidatePath("/notifications");
  return {};
}

export async function deleteNotification(id: string): Promise<{ error?: string }> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").delete().eq("id", id).eq("user_id", userId);
  if (error) return { error: "Could not delete the notification." };
  revalidatePath("/notifications");
  return {};
}
