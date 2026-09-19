"use server";

import { revalidatePath } from "next/cache";
import { getMyProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Turn on Pro for the signed-in user. Free during the beta —
 * when payments arrive, this should move behind the payment webhook.
 */
export async function upgradeToPro(): Promise<Result> {
  const profile = await getMyProfile();
  if (!profile) return { ok: false, error: "Please sign in first." };
  if (profile.is_pro) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_pro: true }).eq("id", profile.id);
  if (error) return { ok: false, error: "Could not upgrade right now. Please try again." };
  revalidatePath("/plan");
  revalidatePath("/settings");
  return { ok: true };
}
