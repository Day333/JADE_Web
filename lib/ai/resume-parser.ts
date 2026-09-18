/**
 * Rule-based resume parser. Splits plain resume text into sections and
 * extracts a structured draft profile that the user reviews before saving.
 */
import { buildSkillMatchers, countSkillMentions, findSkillIds } from "@/lib/ai/skill-matcher";
import type { ExperienceKind, Skill, SkillLevel } from "@/lib/types";

export interface ParsedEducation {
  school: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  courses: string[];
}

export interface ParsedExperience {
  title: string;
  organization?: string;
  kind: ExperienceKind;
  startDate?: string;
  endDate?: string;
  description?: string;
  skills: string[];
}

export interface ParsedProject {
  name: string;
  role?: string;
  description?: string;
  url?: string;
  skills: string[];
}

export interface ParsedSkill {
  skillId: string;
  level: SkillLevel;
  mentions: number;
}

export interface ParsedResume {
  basics: {
    fullName?: string;
    headline?: string;
    email?: string;
    phone?: string;
    location?: string;
    github?: string;
    linkedin?: string;
    website?: string;
  };
  summary?: string;
  educations: ParsedEducation[];
  experiences: ParsedExperience[];
  projects: ParsedProject[];
  skills: ParsedSkill[];
  /** Items from the skills section that are not in the skills catalogue. */
  otherSkills: string[];
  certifications: { name: string; issuer?: string; year?: string }[];
  university?: string;
  degree?: string;
  major?: string;
  graduationYear?: number;
}

type SectionKey = "summary" | "education" | "experience" | "projects" | "skills" | "certifications" | "volunteer" | "other";

const SECTION_HEADINGS: [SectionKey, string[]][] = [
  ["summary", ["summary", "profile", "about me", "professional summary", "career objective", "objective", "personal statement"]],
  ["education", ["education", "academic background", "academic qualifications", "qualifications", "education and training", "academic history"]],
  [
    "experience",
    [
      "experience", "work experience", "professional experience", "employment", "employment history", "work history",
      "internships", "internship experience", "relevant experience", "research experience", "industry experience",
      "career history",
    ],
  ],
  ["projects", ["projects", "personal projects", "academic projects", "selected projects", "project experience", "key projects", "technical projects"]],
  [
    "skills",
    [
      "skills", "technical skills", "core skills", "key skills", "skills & tools", "skills and tools", "tools", "technologies",
      "competencies", "technical proficiencies", "skills & interests", "skills and interests", "tech stack",
    ],
  ],
  [
    "certifications",
    ["certifications", "certificates", "licenses & certifications", "licences & certifications", "courses & certifications", "awards & certifications", "awards", "honours & awards", "honors & awards", "achievements"],
  ],
  ["volunteer", ["volunteering", "volunteer experience", "leadership", "leadership & activities", "extracurricular activities", "extracurriculars", "activities"]],
  ["other", ["publications", "interests", "hobbies", "references", "languages", "referees"]],
];

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE = `(?:${MONTH}\\s+(?:19|20)\\d{2}|\\d{1,2}/(?:19|20)\\d{2}|(?:19|20)\\d{2})`;
const RANGE_RE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|until)\\s*(${DATE}|present|current|now|ongoing|today)`, "i");
const SINGLE_DATE_RE = new RegExp(`(?:expected\\s+|graduat\\w*\\s+)?(${DATE})`, "i");
const YEAR_RE = /(19|20)\d{2}/g;
const BULLET_RE = /^\s*(?:[•●▪◦‣∙·*\-–]|\d+[.)])\s+/;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)\d{3,4}[\s-]?\d{3,4}/;
const URL_RE = /(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s,;)]*)?/gi;
const SCHOOL_RE = /\b(university|college|institute|school|academy|polytechnic|tafe)\b/i;
const DEGREE_RE =
  /\b(bachelor|master|doctor|ph\.?d|diploma|certificate|associate degree|honours|honors|b\.?\s?sc|m\.?\s?sc|b\.?\s?eng|m\.?\s?eng|b\.?\s?com|m\.?\s?com|b\.?\s?a\b|m\.?\s?a\b|mba|m\.?\s?it|b\.?\s?it|juris doctor|high school certificate)\b/i;
const ORG_HINT_RE = /\b(pty|ltd|inc|llc|corp|group|bank|labs?|technologies|solutions|consulting|university|institute|agency|studio|limited|co\.)\b/i;
const LOCATION_RE =
  /\b(Sydney|Melbourne|Brisbane|Perth|Adelaide|Canberra|Hobart|Darwin|Gold Coast|Newcastle|Wollongong|Geelong|Auckland|Wellington|Singapore|Hong Kong|Shanghai|Beijing|Shenzhen|London|New York|San Francisco|Toronto|Remote)\b(?:,?\s*(NSW|VIC|QLD|WA|SA|TAS|ACT|NT|Australia|New Zealand|China|UK|USA|Canada))?/i;

function normaliseHeading(line: string) {
  return line
    .toLowerCase()
    .replace(/[:|]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectSection(line: string): SectionKey | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 40 || BULLET_RE.test(trimmed)) return null;
  const heading = normaliseHeading(trimmed);
  for (const [key, names] of SECTION_HEADINGS) {
    if (names.includes(heading)) return key;
  }
  return null;
}

function stripBullet(line: string) {
  return line.replace(BULLET_RE, "").trim();
}

function titleCase(text: string) {
  return text.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

function extractRange(text: string): { start?: string; end?: string; rest: string } {
  const m = text.match(RANGE_RE);
  if (m) {
    const end = /present|current|now|ongoing|today/i.test(m[2]) ? "Present" : m[2];
    return { start: m[1], end, rest: text.replace(m[0], " ").replace(/\s{2,}/g, " ").trim() };
  }
  const single = text.match(SINGLE_DATE_RE);
  if (single) return { end: single[1], rest: text.replace(single[0], " ").replace(/\s{2,}/g, " ").trim() };
  return { rest: text };
}

function cleanPart(text: string) {
  return text
    .replace(/[|,–—-]+\s*$/g, "")
    .replace(/^\s*[|,–—-]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function splitParts(text: string) {
  return text
    .split(/\s+[|–—]\s+|\s+-\s+|\s+at\s+|\s*\|\s*|,\s+(?=[A-Z])/)
    .map(cleanPart)
    .filter(Boolean);
}

/** Group section lines into entries: a header (non-bullet lines) followed by bullets. */
function splitEntries(lines: string[]): { header: string[]; body: string[] }[] {
  const entries: { header: string[]; body: string[] }[] = [];
  let current: { header: string[]; body: string[] } | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const isBullet = BULLET_RE.test(line);
    if (isBullet) {
      if (!current) current = { header: [], body: [] };
      current.body.push(stripBullet(line));
      continue;
    }
    const startsNew =
      !current ||
      current.body.length > 0 ||
      (RANGE_RE.test(line) && current.header.some((h) => RANGE_RE.test(h))) ||
      current.header.length >= 3;
    if (startsNew) {
      current = { header: [line], body: [] };
      entries.push(current);
    } else {
      current!.header.push(line);
    }
  }
  if (current && !entries.includes(current)) entries.push(current);
  return entries.filter((e) => e.header.length > 0 || e.body.length > 0);
}

function parseEducation(lines: string[]): ParsedEducation[] {
  const out: ParsedEducation[] = [];
  let current: ParsedEducation | null = null;
  const push = () => {
    if (current && (current.school || current.degree)) out.push(current);
  };
  for (const raw of lines) {
    const line = stripBullet(raw);
    if (!line) continue;
    const courseMatch = line.match(/^(relevant coursework|coursework|courses|key subjects|major subjects|subjects)\s*[:\-–]\s*(.+)$/i);
    if (courseMatch && current) {
      current.courses.push(
        ...courseMatch[2]
          .split(/[,;•|]/)
          .map((c) => c.trim())
          .filter((c) => c.length > 1),
      );
      continue;
    }
    const { start, end, rest } = extractRange(line);
    const parts = splitParts(rest);
    const schoolPart = parts.find((p) => SCHOOL_RE.test(p));
    const degreePart = parts.find((p) => DEGREE_RE.test(p));
    if (schoolPart && (!current || current.school)) {
      push();
      current = { school: schoolPart, courses: [] };
    } else if (schoolPart && current) {
      current.school = schoolPart;
    }
    if (degreePart) {
      if (!current) current = { school: "", courses: [] };
      if (current.degree && !schoolPart) {
        push();
        current = { school: "", courses: [] };
      }
      current.degree = degreePart;
      // "Bachelor of Science in Statistics" -> "Statistics" (last "of"/"in")
      const field = degreePart.match(/.*\b(?:of|in)\s+(.+)$/i)?.[1];
      if (field) current.field = field.replace(/\(.*?\)/g, "").trim();
    }
    if (current && (start || end)) {
      current.startDate ??= start;
      current.endDate ??= end;
    }
  }
  push();
  return out.map((e) => ({ ...e, school: e.school || "Unknown institution" }));
}

function experienceKind(text: string, section: SectionKey): ExperienceKind {
  if (/\bintern(ship)?\b/i.test(text)) return "internship";
  if (/\bresearch\b/i.test(text)) return "research";
  if (section === "volunteer" || /\bvolunteer/i.test(text)) return "volunteer";
  return "work";
}

function parseExperiences(lines: string[], section: SectionKey, matchers: ReturnType<typeof buildSkillMatchers>) {
  return splitEntries(lines)
    .map((entry): ParsedExperience | null => {
      const headerText = entry.header.join(" | ");
      const { start, end, rest } = extractRange(headerText);
      const parts = splitParts(rest).filter((p) => !LOCATION_RE.test(p) || p.split(" ").length > 3);
      if (parts.length === 0 && entry.body.length === 0) return null;
      let title = parts[0] ?? "Experience";
      let organization = parts[1];
      if (organization && ORG_HINT_RE.test(title) && !ORG_HINT_RE.test(organization)) {
        [title, organization] = [organization, title];
      }
      const description = entry.body.join("\n") || undefined;
      const fullText = `${headerText}\n${description ?? ""}`;
      return {
        title: title.slice(0, 120),
        organization: organization?.slice(0, 120),
        kind: experienceKind(fullText, section),
        startDate: start,
        endDate: end,
        description,
        skills: findSkillIds(fullText, matchers),
      };
    })
    .filter((e): e is ParsedExperience => e !== null);
}

function parseProjects(lines: string[], matchers: ReturnType<typeof buildSkillMatchers>): ParsedProject[] {
  return splitEntries(lines)
    .map((entry): ParsedProject | null => {
      const headerText = entry.header.join(" | ");
      const { rest } = extractRange(headerText);
      const name = splitParts(rest)[0] ?? entry.body[0]?.slice(0, 80);
      if (!name) return null;
      const all = `${headerText}\n${entry.body.join("\n")}`;
      const url = all.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s,;)]+|https?:\/\/[^\s,;)]+/i)?.[0];
      return {
        name: name.slice(0, 120),
        description: entry.body.join("\n") || undefined,
        url: url ? (url.startsWith("http") ? url : `https://${url}`) : undefined,
        skills: findSkillIds(all, matchers),
      };
    })
    .filter((p): p is ParsedProject => p !== null);
}

function parseCertifications(lines: string[]) {
  return lines
    .map(stripBullet)
    .filter((l) => l.length > 2)
    .map((line) => {
      const year = line.match(/(19|20)\d{2}/)?.[0];
      const cleaned = line.replace(/\(?(19|20)\d{2}\)?/g, "").trim();
      const [name, issuer] = cleaned.split(/\s+[–—-]\s+|\s*\|\s*|,\s+/);
      return { name: cleanPart(name ?? cleaned).slice(0, 160), issuer: issuer ? cleanPart(issuer) : undefined, year };
    })
    .filter((c) => c.name.length > 2);
}

function findName(lines: string[]) {
  for (const raw of lines.slice(0, 6)) {
    const line = raw.trim();
    if (!line || EMAIL_RE.test(line) || /\d/.test(line) || detectSection(line)) continue;
    if (/resume|curriculum vitae|\bcv\b/i.test(line)) continue;
    const candidate = line.split(/\s+[|–—]\s+/)[0].trim();
    const words = candidate.split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-Za-z][A-Za-z'.-]*$/.test(w))) {
      return candidate === candidate.toUpperCase() ? titleCase(candidate) : candidate;
    }
  }
  return undefined;
}

/** Advanced when used in two or more experiences/projects, otherwise proficient. */
function levelFor(entryCount: number): SkillLevel {
  return entryCount >= 2 ? 3 : 2;
}

export function parseResumeText(text: string, skills: Pick<Skill, "id" | "name" | "aliases">[]): ParsedResume {
  const lines = text
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .split("\n")
    .map((l) => l.replace(/ /g, " ").replace(/\s{2,}/g, " ").trimEnd());

  // Split into sections
  const sections = new Map<SectionKey, string[]>();
  const header: string[] = [];
  let current: SectionKey | null = null;
  for (const line of lines) {
    const key = detectSection(line);
    if (key) {
      current = key;
      if (!sections.has(key)) sections.set(key, []);
      continue;
    }
    if (current) sections.get(current)!.push(line);
    else header.push(line);
  }

  const matchers = buildSkillMatchers(skills);
  const top = header.length > 0 ? header : lines.slice(0, 8);
  const topText = top.join("\n");
  const withoutEmails = text.replace(new RegExp(EMAIL_RE.source, "g"), " ");
  const urls = [...withoutEmails.matchAll(URL_RE)].map((m) => m[0]).filter((u) => u.includes("."));
  const withProtocol = (u?: string) => (u ? (u.startsWith("http") ? u : `https://${u}`) : undefined);
  const github = urls.find((u) => /github\.com\//i.test(u));
  const linkedin = urls.find((u) => /linkedin\.com\//i.test(u));
  const website = urls.find(
    (u) => !/github\.com|linkedin\.com|gmail|outlook|hotmail|yahoo/i.test(u) && /\.(com|io|dev|me|net|org|app|site|au)(\/|$)/i.test(u),
  );

  const fullName = findName(top);
  const headlineLine = top
    .map((l) => l.trim())
    .find(
      (l) =>
        l &&
        l !== fullName &&
        !EMAIL_RE.test(l) &&
        !PHONE_RE.test(l) &&
        !/https?:|www\.|\.com/i.test(l) &&
        l.length < 80 &&
        /[a-z]/.test(l),
    );

  const educations = parseEducation(sections.get("education") ?? []);
  const experiences = [
    ...parseExperiences(sections.get("experience") ?? [], "experience", matchers),
    ...parseExperiences(sections.get("volunteer") ?? [], "volunteer", matchers),
  ];
  const projects = parseProjects(sections.get("projects") ?? [], matchers);

  // Skills: count mentions everywhere; short ambiguous aliases only in the skills list.
  const skillsSection = (sections.get("skills") ?? []).join("\n");
  const mentionCounts = countSkillMentions(text, matchers);
  for (const [id, n] of countSkillMentions(skillsSection, matchers, true)) {
    mentionCounts.set(id, Math.max(mentionCounts.get(id) ?? 0, n));
  }
  const entrySkillCounts = new Map<string, number>();
  for (const entry of [...experiences, ...projects]) {
    for (const id of entry.skills) entrySkillCounts.set(id, (entrySkillCounts.get(id) ?? 0) + 1);
  }
  const parsedSkills: ParsedSkill[] = [...mentionCounts.entries()]
    .map(([skillId, mentions]) => ({ skillId, mentions, level: levelFor(entrySkillCounts.get(skillId) ?? 0) }))
    .sort((a, b) => b.mentions - a.mentions);

  // Items listed in the skills section that we could not map to the catalogue.
  const knownNames = new Set(skills.flatMap((s) => [s.name.toLowerCase(), ...s.aliases.map((a) => a.replace(/^=/, "").toLowerCase())]));
  const otherSkills = [
    ...new Set(
      skillsSection
        .split(/[\n,;•|/]|\s{2,}/)
        .map((s) => stripBullet(s).replace(/^[A-Za-z &]+:\s*/, "").trim())
        .filter((s) => s.length >= 2 && s.length <= 30 && !/\d{4}/.test(s) && !knownNames.has(s.toLowerCase())),
    ),
  ].slice(0, 15);

  const firstEdu = educations[0];
  const eduYears = (sections.get("education") ?? []).join(" ").match(YEAR_RE)?.map(Number) ?? [];
  const summaryText = (sections.get("summary") ?? []).map((l) => l.trim()).filter(Boolean).join(" ");

  return {
    basics: {
      fullName,
      headline: headlineLine && headlineLine.split(/\s+/).length <= 10 ? headlineLine : undefined,
      email: text.match(EMAIL_RE)?.[0],
      phone: topText.match(PHONE_RE)?.[0]?.trim(),
      location: topText.match(LOCATION_RE)?.[0],
      github: withProtocol(github),
      linkedin: withProtocol(linkedin),
      website: withProtocol(website),
    },
    summary: summaryText || undefined,
    educations,
    experiences,
    projects,
    skills: parsedSkills,
    otherSkills,
    certifications: parseCertifications(sections.get("certifications") ?? []),
    university: firstEdu?.school,
    degree: firstEdu?.degree,
    major: firstEdu?.field,
    graduationYear: eduYears.length > 0 ? Math.max(...eduYears) : undefined,
  };
}
