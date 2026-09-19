import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Achievement, PracticeQuestion } from "@/lib/types";

/**
 * Growth data: activity for the heatmap, headline stats, achievements and
 * the practice question bank. Everything is derived from existing rows
 * (application events, practice progress, posts and likes) — no counters
 * to keep in sync.
 */

export type ActivityKind = "applications" | "interviews" | "questions";

export interface ActivityDay {
  /** YYYY-MM-DD (UTC) */
  date: string;
  applications: number;
  interviews: number;
  questions: number;
  total: number;
}

export interface StatLine {
  total: number;
  lastWeek: number;
}

export interface GrowthData {
  /** Only days with activity, keyed by YYYY-MM-DD. */
  days: Map<string, ActivityDay>;
  stats: {
    applications: StatLine;
    interviews: StatLine;
    questions: StatLine;
    reputation: StatLine;
  };
  achievements: (Achievement & { earnedAt: string | null })[];
  earnedCount: number;
  points: number;
}

const dayOf = (timestamp: string) => timestamp.slice(0, 10);

function bump(days: Map<string, ActivityDay>, date: string, kind: ActivityKind) {
  const day = days.get(date) ?? { date, applications: 0, interviews: 0, questions: 0, total: 0 };
  day[kind] += 1;
  day.total += 1;
  days.set(date, day);
}

function statLine(dates: string[], weekAgo: string): StatLine {
  return { total: dates.length, lastWeek: dates.filter((d) => d >= weekAgo).length };
}

export async function loadGrowth(userId: string): Promise<GrowthData> {
  const supabase = await createClient();
  const [events, practice, likes, catalog, earned] = await Promise.all([
    supabase
      .from("application_events")
      .select("created_at, status, applications!inner(user_id)")
      .eq("applications.user_id", userId)
      .in("status", ["applied", "interview"]),
    supabase.from("practice_progress").select("done_at").eq("user_id", userId),
    supabase.from("post_likes").select("created_at, posts!inner(author_id)").eq("posts.author_id", userId),
    supabase.from("achievements").select("*").order("sort"),
    supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", userId),
  ]);

  const applied = (events.data ?? []).filter((e) => e.status === "applied").map((e) => e.created_at);
  const interviews = (events.data ?? []).filter((e) => e.status === "interview").map((e) => e.created_at);
  const questions = (practice.data ?? []).map((p) => p.done_at);

  const days = new Map<string, ActivityDay>();
  applied.forEach((t) => bump(days, dayOf(t), "applications"));
  interviews.forEach((t) => bump(days, dayOf(t), "interviews"));
  questions.forEach((t) => bump(days, dayOf(t), "questions"));

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const earnedById = new Map((earned.data ?? []).map((e) => [e.achievement_id, e.earned_at]));
  const achievements = (catalog.data ?? []).map((a) => ({ ...a, earnedAt: earnedById.get(a.id) ?? null }));
  const points = achievements.reduce((sum, a) => sum + (a.earnedAt ? a.points : 0), 0);
  const likeDates = (likes.data ?? []).map((l) => l.created_at.slice(0, 10));

  return {
    days,
    stats: {
      applications: statLine(applied.map(dayOf), weekAgo),
      interviews: statLine(interviews.map(dayOf), weekAgo),
      questions: statLine(questions.map(dayOf), weekAgo),
      // Reputation grows with badges (their points) and likes your posts receive.
      reputation: {
        total: points + likeDates.length,
        lastWeek:
          achievements.filter((a) => a.earnedAt && a.earnedAt.slice(0, 10) >= weekAgo).reduce((s, a) => s + a.points, 0) +
          likeDates.filter((d) => d >= weekAgo).length,
      },
    },
    achievements,
    earnedCount: achievements.filter((a) => a.earnedAt).length,
    points,
  };
}

export interface PracticeData {
  questions: PracticeQuestion[];
  doneIds: Set<string>;
}

export async function loadPractice(userId: string): Promise<PracticeData> {
  const supabase = await createClient();
  const [questions, progress] = await Promise.all([
    supabase.from("practice_questions").select("*").order("category").order("sort"),
    supabase.from("practice_progress").select("question_id").eq("user_id", userId),
  ]);
  return {
    questions: questions.data ?? [],
    doneIds: new Set((progress.data ?? []).map((p) => p.question_id)),
  };
}
