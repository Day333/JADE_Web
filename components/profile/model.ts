/**
 * Shared shapes and pure helpers for Career Profile editing. Used by the
 * review step, the /profile editors (client) and the server actions.
 */
import type { ExperienceKind, SkillLevel } from "@/lib/types";
import type { Enums } from "@/lib/database.types";

export type SkillCategory = Enums<"skill_category">;
export type PortfolioKind = "github" | "website" | "work" | "other";

export const EXPERIENCE_KINDS: { value: ExperienceKind; label: string }[] = [
  { value: "internship", label: "Internship" },
  { value: "work", label: "Work" },
  { value: "research", label: "Research" },
  { value: "volunteer", label: "Volunteer" },
  { value: "other", label: "Other" },
];

export const EXPERIENCE_KIND_LABELS: Record<ExperienceKind, string> = Object.fromEntries(
  EXPERIENCE_KINDS.map((k) => [k.value, k.label]),
) as Record<ExperienceKind, string>;

export const LEVEL_OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: 1, label: "Basic" },
  { value: 2, label: "Proficient" },
  { value: 3, label: "Advanced" },
];

export const PORTFOLIO_KINDS: { value: PortfolioKind; label: string }[] = [
  { value: "github", label: "GitHub" },
  { value: "website", label: "Website" },
  { value: "work", label: "Work sample" },
  { value: "other", label: "Other" },
];

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  technical: "Technical Skills",
  tool: "Tools & Platforms",
  domain: "Domain Knowledge",
  soft: "Soft Skills",
};

export interface BasicsInput {
  fullName: string;
  headline: string;
  bio: string;
  location: string;
  university: string;
  degree: string;
  major: string;
  graduationYear: string;
}

export interface LinksInput {
  github: string;
  linkedin: string;
  website: string;
}

export interface EducationInput {
  id?: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  courses: string[];
}

export interface ExperienceInput {
  id?: string;
  title: string;
  organization: string;
  kind: ExperienceKind;
  startDate: string;
  endDate: string;
  description: string;
  skills: string[];
}

export interface ProjectInput {
  id?: string;
  name: string;
  role: string;
  description: string;
  url: string;
  skills: string[];
}

export interface CertificationInput {
  id?: string;
  name: string;
  issuer: string;
  year: string;
  url: string;
}

export interface PortfolioInput {
  id?: string;
  title: string;
  url: string;
  kind: PortfolioKind;
  description: string;
}

export interface DraftSkill {
  skillId: string;
  name: string;
  level: SkillLevel;
  source: "resume" | "manual";
  category?: SkillCategory;
  isCustom?: boolean;
}

/** Everything the review step lets the user confirm. */
export interface ProfileDraft {
  basics: BasicsInput;
  links: LinksInput;
  educations: EducationInput[];
  experiences: ExperienceInput[];
  projects: ProjectInput[];
  skills: DraftSkill[];
  certifications: CertificationInput[];
}

/** Catalogue skill as sent to the browser for autocomplete. */
export interface SkillOption {
  id: string;
  name: string;
  category: SkillCategory;
  aliases: string[];
}

export interface CareerOption {
  id: string;
  title: string;
  field: string;
}

export const PRIVACY_KEYS = [
  "profile_public",
  "resume_public",
  "goal_public",
  "open_to_opportunities",
  "allow_recruiter_contact",
  "show_status_to_recruiters",
] as const;

export type PrivacyKey = (typeof PRIVACY_KEYS)[number];

export type ActionResult = { ok: true; message?: string } | { error: string };

export function emptyBasics(): BasicsInput {
  return { fullName: "", headline: "", bio: "", location: "", university: "", degree: "", major: "", graduationYear: "" };
}

export function emptyEducation(): EducationInput {
  return { school: "", degree: "", field: "", startDate: "", endDate: "", courses: [] };
}

export function emptyExperience(): ExperienceInput {
  return { title: "", organization: "", kind: "internship", startDate: "", endDate: "", description: "", skills: [] };
}

export function emptyProject(): ProjectInput {
  return { name: "", role: "", description: "", url: "", skills: [] };
}

export function emptyCertification(): CertificationInput {
  return { name: "", issuer: "", year: "", url: "" };
}

export function emptyPortfolio(): PortfolioInput {
  return { title: "", url: "", kind: "github", description: "" };
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\+/g, "plus")
    .replace(/#/g, "sharp")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function customSkillId(name: string) {
  const slug = slugify(name);
  return slug ? `custom-${slug}` : "";
}

export const CUSTOM_SKILL_RE = /^custom-[a-z0-9-]{1,50}$/;

/** Find a catalogue skill by its name or one of its aliases (case-insensitive). */
export function findSkillByName<T extends Pick<SkillOption, "id" | "name" | "aliases">>(options: T[], name: string): T | undefined {
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;
  return (
    options.find((s) => s.name.toLowerCase() === needle) ??
    options.find((s) => s.aliases.some((a) => a.replace(/^=/, "").toLowerCase() === needle))
  );
}

/** Normalise a key for duplicate detection. */
export function dedupeKey(...parts: (string | null | undefined)[]) {
  return parts.map((p) => (p ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()).join("|");
}

export function levelLabel(level: number) {
  return LEVEL_OPTIONS.find((l) => l.value === level)?.label ?? "Proficient";
}

/** Split "a, b; c" into a clean list. */
export function splitList(text: string) {
  return [
    ...new Set(
      text
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

/** "github.com/me" -> "https://github.com/me"; returns "" for empty input and null when invalid. */
export function normalizeUrl(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  if (!text) return "";
  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withProtocol);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) return null;
    const out = url.toString();
    return url.pathname === "/" && !url.search && !url.hash ? out.replace(/\/$/, "") : out;
  } catch {
    return null;
  }
}

/** Short, readable version of a URL for display. */
export function displayUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}
