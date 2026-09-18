"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribe to INSERTs on a table with Supabase Realtime. Returns an
 * unsubscribe function for useEffect cleanup.
 *
 * - The socket is authenticated with the signed-in user's JWT *before* the
 *   channel joins. Otherwise the join can race the async session lookup and
 *   the subscription runs as `anon`, so RLS silently filters every event.
 * - Channel names get a random suffix: supabase-js reuses a channel with the
 *   same name, and React strict mode mounts effects twice.
 */
export function subscribeToInserts<Row>(
  name: string,
  table: "messages" | "notifications",
  filter: string | null,
  onInsert: (row: Row) => void,
) {
  const supabase = createClient();
  let channel: RealtimeChannel | null = null;
  let cancelled = false;

  void (async () => {
    try {
      await supabase.realtime.setAuth();
    } catch {
      // Fall through: subscribing still works for public data.
    }
    if (cancelled) return;
    channel = supabase
      .channel(`${name}-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        filter ? { event: "INSERT", schema: "public", table, filter } : { event: "INSERT", schema: "public", table },
        (payload) => onInsert(payload.new as Row),
      )
      .subscribe();
  })();

  return () => {
    cancelled = true;
    if (channel) void supabase.removeChannel(channel);
  };
}
