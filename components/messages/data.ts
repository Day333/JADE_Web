import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MessageAttachment, UserRole } from "@/lib/types";

export interface ChatPerson {
  id: string;
  full_name: string | null;
  headline: string | null;
  role: UserRole;
  companyName: string | null;
}

export interface ChatJob {
  id: string;
  title: string;
  companyName: string | null;
}

export interface ConversationSummary {
  id: string;
  other: ChatPerson | null;
  job: ChatJob | null;
  lastMessage: { body: string; attachment: MessageAttachment | null; senderId: string; createdAt: string } | null;
  lastMessageAt: string;
  unread: boolean;
}

type MemberRow = {
  conversation_id: string;
  user_id: string;
  profile: {
    id: string;
    full_name: string | null;
    headline: string | null;
    role: UserRole;
    company: { name: string } | null;
  } | null;
};

const MEMBER_SELECT =
  "conversation_id, user_id, profile:profiles!conversation_members_user_id_fkey(id, full_name, headline, role, company:companies!profiles_company_id_fkey(name))";

const CONVERSATION_SELECT =
  "id, job_id, last_message_at, job:jobs!conversations_job_id_fkey(id, title, company:companies!jobs_company_id_fkey(name))";

type ConversationRow = {
  id: string;
  job_id: string | null;
  last_message_at: string;
  job: { id: string; title: string; company: { name: string } | null } | null;
};

function toPerson(row: MemberRow | undefined): ChatPerson | null {
  if (!row?.profile) return null;
  return {
    id: row.profile.id,
    full_name: row.profile.full_name,
    headline: row.profile.headline,
    role: row.profile.role,
    companyName: row.profile.company?.name ?? null,
  };
}

function toJob(row: ConversationRow): ChatJob | null {
  if (!row.job) return null;
  return { id: row.job.id, title: row.job.title, companyName: row.job.company?.name ?? null };
}

/** The viewer's conversations, most recent first. */
export async function loadConversations(userId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data: mine } = await supabase
    .from("conversation_members")
    .select(`last_read_at, conversation:conversations!conversation_members_conversation_id_fkey(${CONVERSATION_SELECT})`)
    .eq("user_id", userId);
  const rows = (mine ?? []) as unknown as { last_read_at: string; conversation: ConversationRow | null }[];
  const conversations = rows.filter((r) => r.conversation);
  if (conversations.length === 0) return [];
  const ids = conversations.map((r) => r.conversation!.id);

  const [{ data: others }, lastMessages] = await Promise.all([
    supabase.from("conversation_members").select(MEMBER_SELECT).in("conversation_id", ids).neq("user_id", userId),
    Promise.all(
      ids.map((id) =>
        supabase
          .from("messages")
          .select("body, attachment, sender_id, created_at")
          .eq("conversation_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
    ),
  ]);
  const otherByConversation = new Map(((others ?? []) as unknown as MemberRow[]).map((m) => [m.conversation_id, m]));

  return conversations
    .map((r, i) => {
      const c = r.conversation!;
      const last = lastMessages[i].data;
      return {
        id: c.id,
        other: toPerson(otherByConversation.get(c.id)),
        job: toJob(c),
        lastMessage: last
          ? {
              body: last.body,
              attachment: (last.attachment as unknown as MessageAttachment | null) ?? null,
              senderId: last.sender_id,
              createdAt: last.created_at,
            }
          : null,
        lastMessageAt: c.last_message_at,
        unread: !!last && last.sender_id !== userId && new Date(c.last_message_at) > new Date(r.last_read_at),
      };
    })
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

/** One conversation the viewer belongs to, with the other member and job context. */
export async function loadConversation(conversationId: string, userId: string) {
  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return null;
  const { data: members } = await supabase
    .from("conversation_members")
    .select(MEMBER_SELECT)
    .eq("conversation_id", conversationId);
  const memberRows = (members ?? []) as unknown as MemberRow[];
  if (!memberRows.some((m) => m.user_id === userId)) return null;
  const row = conversation as unknown as ConversationRow;
  return {
    id: row.id,
    jobId: row.job_id,
    job: toJob(row),
    other: toPerson(memberRows.find((m) => m.user_id !== userId)),
  };
}
