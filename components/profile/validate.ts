/**
 * Input validation for Career Profile writes. Pure functions shared by the
 * profile and onboarding server actions: they trim, cap lengths and turn
 * form inputs into database rows (or a human readable error).
 */
import type { Database, TablesInsert } from "@/lib/database.types";
import type { ExperienceKind, SkillLevel } from "@/lib/types";
import {
  EXPERIENCE_KINDS,
  PORTFOLIO_KINDS,
  normalizeUrl,
  type BasicsInput,
  type CertificationInput,
  type EducationInput,
  type ExperienceInput,
  type LinksInput,
  type PortfolioInput,
  type PortfolioKind,
  type ProjectInput,
} from "@/components/profile/model";

export class ValidationError extends Error {}

export function text(value: unknown, max = 200): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Multi-line text: keeps line breaks, trims each line. */
export function longText(value: unknown, max = 4000): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

export function orNull(value: string) {
  return value === "" ? null : value;
}

export function list(value: unknown, maxItems = 30, maxLength = 80): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => text(v, maxLength)).filter(Boolean))].slice(0, maxItems);
}

export function url(value: unknown, label: string): string | null {
  const normalized = normalizeUrl(typeof value === "string" ? value.slice(0, 500) : "");
  if (normalized === null) throw new ValidationError(`${label} doesn't look like a valid web address.`);
  return orNull(normalized);
}

export function level(value: unknown): SkillLevel {
  const n = Number(value);
  return n === 1 || n === 3 ? n : 2;
}

export function gradYear(value: unknown): number | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1950 || n > 2100) throw new ValidationError("Graduation year should be a year like 2026.");
  return n;
}

function kind(value: unknown): ExperienceKind {
  return EXPERIENCE_KINDS.some((k) => k.value === value) ? (value as ExperienceKind) : "other";
}

function portfolioKind(value: unknown): PortfolioKind {
  return PORTFOLIO_KINDS.some((k) => k.value === value) ? (value as PortfolioKind) : "other";
}

export function basicsRow(input: BasicsInput) {
  const fullName = text(input.fullName, 100);
  if (!fullName) throw new ValidationError("Please enter your name.");
  return {
    full_name: fullName,
    headline: orNull(text(input.headline, 140)),
    bio: orNull(longText(input.bio, 1500)),
    location: orNull(text(input.location, 100)),
    university: orNull(text(input.university, 150)),
    degree: orNull(text(input.degree, 150)),
    major: orNull(text(input.major, 150)),
    graduation_year: gradYear(input.graduationYear),
  };
}

export function linksRow(input: LinksInput) {
  return {
    github_url: url(input.github, "GitHub"),
    linkedin_url: url(input.linkedin, "LinkedIn"),
    website_url: url(input.website, "Website"),
  };
}

type Row<T extends keyof Database["public"]["Tables"]> = Omit<TablesInsert<T>, "user_id">;

export function educationRow(input: EducationInput): Row<"educations"> {
  const school = text(input.school, 150);
  if (!school) throw new ValidationError("Please enter the school or university.");
  return {
    school,
    degree: orNull(text(input.degree, 150)),
    field: orNull(text(input.field, 150)),
    start_date: orNull(text(input.startDate, 40)),
    end_date: orNull(text(input.endDate, 40)),
    courses: list(input.courses, 30, 100),
  };
}

export function experienceRow(input: ExperienceInput): Row<"experiences"> {
  const title = text(input.title, 120);
  if (!title) throw new ValidationError("Please enter a title for the experience.");
  return {
    title,
    organization: orNull(text(input.organization, 120)),
    kind: kind(input.kind),
    start_date: orNull(text(input.startDate, 40)),
    end_date: orNull(text(input.endDate, 40)),
    description: orNull(longText(input.description, 4000)),
    skills: list(input.skills, 40, 60),
  };
}

export function projectRow(input: ProjectInput): Row<"projects"> {
  const name = text(input.name, 120);
  if (!name) throw new ValidationError("Please enter a project name.");
  return {
    name,
    role: orNull(text(input.role, 120)),
    description: orNull(longText(input.description, 4000)),
    url: url(input.url, "Project link"),
    skills: list(input.skills, 40, 60),
  };
}

export function certificationRow(input: CertificationInput): Row<"certifications"> {
  const name = text(input.name, 160);
  if (!name) throw new ValidationError("Please enter the certification name.");
  return {
    name,
    issuer: orNull(text(input.issuer, 120)),
    year: orNull(text(input.year, 20)),
    url: url(input.url, "Certification link"),
  };
}

export function portfolioRow(input: PortfolioInput): Row<"portfolio_items"> {
  const title = text(input.title, 120);
  if (!title) throw new ValidationError("Please enter a title.");
  const link = url(input.url, "Link");
  if (!link) throw new ValidationError("Please enter a link.");
  return {
    title,
    url: link,
    kind: portfolioKind(input.kind),
    description: orNull(longText(input.description, 500)),
  };
}

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof ValidationError) return error.message;
  return fallback;
}
