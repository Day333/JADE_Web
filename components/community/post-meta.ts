import {
  BookOpen,
  Briefcase,
  Building2,
  GraduationCap,
  Hash,
  HelpCircle,
  Lightbulb,
  Map,
  MessagesSquare,
  Route,
  School,
  Star,
  type LucideIcon,
} from "lucide-react";
import { POST_TYPE_LABELS } from "@/lib/format";
import type { CommunityKind, PostType } from "@/lib/types";

export const POST_TYPES = Object.keys(POST_TYPE_LABELS) as PostType[];

export function isPostType(value: unknown): value is PostType {
  return typeof value === "string" && (POST_TYPES as string[]).includes(value);
}

export const POST_TYPE_ICONS: Record<PostType, LucideIcon> = {
  experience: Lightbulb,
  career_journey: Route,
  interview: MessagesSquare,
  company_review: Star,
  graduate_program: GraduationCap,
  internship: Briefcase,
  question: HelpCircle,
  resource: BookOpen,
};

export const POST_TYPE_TONES: Record<PostType, string> = {
  experience: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  career_journey: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/25",
  interview: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25",
  company_review: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
  graduate_program: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25",
  internship: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
  question: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
  resource: "bg-lime-500/10 text-lime-700 dark:text-lime-300 border-lime-500/25",
};

/** One-line hint shown when choosing a post type. */
export const POST_TYPE_HINTS: Record<PostType, string> = {
  experience: "Something you learned along the way.",
  career_journey: "How you got from where you started to where you are.",
  interview: "Questions, format and tips from a real interview.",
  company_review: "What it's really like to work or intern somewhere.",
  graduate_program: "Timelines, assessments and life in a graduate program.",
  internship: "Finding, landing and making the most of an internship.",
  question: "Ask the community for advice.",
  resource: "Courses, guides and tools worth sharing.",
};

export const COMMUNITY_KIND_LABELS: Record<CommunityKind, string> = {
  career: "Career",
  company: "Company",
  university: "University",
  topic: "Topic",
};

export const COMMUNITY_KIND_ICONS: Record<CommunityKind, LucideIcon> = {
  career: Map,
  company: Building2,
  university: School,
  topic: Hash,
};

export const COMMUNITY_KINDS: CommunityKind[] = ["career", "company", "university", "topic"];
