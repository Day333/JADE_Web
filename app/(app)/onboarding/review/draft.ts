import "server-only";

import type { ParsedResume } from "@/lib/ai/resume-parser";
import type { Catalog, Profile, SkillLevel } from "@/lib/types";
import {
  CUSTOM_SKILL_RE,
  customSkillId,
  dedupeKey,
  findSkillByName,
  type DraftSkill,
  type ProfileDraft,
} from "@/components/profile/model";

export interface ExistingItems {
  educations: { school: string; degree: string | null }[];
  experiences: { title: string; organization: string | null }[];
  projects: { name: string }[];
  certifications: { name: string }[];
  skills: { skill_id: string; level: number }[];
}

const s = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * Turn a parsed resume into an editable draft. Profile values the user
 * already has win over parsed ones; items already on the profile are left
 * out (and counted) so the review only shows what's new.
 */
export function buildDraft(
  parsed: ParsedResume | null,
  profile: Profile,
  catalog: Catalog,
  existing: ExistingItems,
): { draft: ProfileDraft; hidden: number; foundSkills: number; otherSkills: string[] } {
  const p = parsed;
  const basics = p?.basics ?? {};
  let hidden = 0;

  const seen = (keys: string[]) => {
    const set = new Set(keys);
    return (key: string) => {
      if (set.has(key)) {
        hidden += 1;
        return false;
      }
      set.add(key);
      return true;
    };
  };

  const eduOk = seen(existing.educations.map((e) => dedupeKey(e.school, e.degree)));
  const expOk = seen(existing.experiences.map((e) => dedupeKey(e.title, e.organization)));
  const projOk = seen(existing.projects.map((x) => dedupeKey(x.name)));
  const certOk = seen(existing.certifications.map((c) => dedupeKey(c.name)));

  const educations = (p?.educations ?? [])
    .filter((e) => s(e.school) && eduOk(dedupeKey(e.school, e.degree)))
    .map((e, i) => ({
      id: `edu-${i}`,
      school: s(e.school),
      degree: s(e.degree),
      field: s(e.field),
      startDate: s(e.startDate),
      endDate: s(e.endDate),
      courses: (e.courses ?? []).map(s).filter(Boolean),
    }));

  const experiences = (p?.experiences ?? [])
    .filter((e) => s(e.title) && expOk(dedupeKey(e.title, e.organization)))
    .map((e, i) => ({
      id: `exp-${i}`,
      title: s(e.title),
      organization: s(e.organization),
      kind: e.kind ?? "work",
      startDate: s(e.startDate),
      endDate: s(e.endDate),
      description: s(e.description),
      skills: (e.skills ?? []).filter((id) => typeof id === "string"),
    }));

  const projects = (p?.projects ?? [])
    .filter((x) => s(x.name) && projOk(dedupeKey(x.name)))
    .map((x, i) => ({
      id: `proj-${i}`,
      name: s(x.name),
      role: s(x.role),
      description: s(x.description),
      url: s(x.url),
      skills: (x.skills ?? []).filter((id) => typeof id === "string"),
    }));

  const certifications = (p?.certifications ?? [])
    .filter((c) => s(c.name) && certOk(dedupeKey(c.name)))
    .map((c, i) => ({ id: `cert-${i}`, name: s(c.name), issuer: s(c.issuer), year: s(c.year), url: "" }));

  const existingLevels = new Map(existing.skills.map((x) => [x.skill_id, x.level]));
  const skills: DraftSkill[] = [];
  const skillIds = new Set<string>();
  for (const item of p?.skills ?? []) {
    const known = catalog.skillById.get(item.skillId);
    const id = known ? known.id : CUSTOM_SKILL_RE.test(item.skillId) ? item.skillId : customSkillId(item.skillId);
    if (!id || skillIds.has(id)) continue;
    const level = ([1, 2, 3].includes(item.level) ? item.level : 2) as SkillLevel;
    if ((existingLevels.get(id) ?? 0) >= level) {
      hidden += 1;
      continue;
    }
    skillIds.add(id);
    skills.push({
      skillId: id,
      name: known?.name ?? item.skillId,
      level,
      source: "resume",
      category: known?.category ?? "technical",
      isCustom: !known,
    });
  }

  const otherSkills = (p?.otherSkills ?? [])
    .map(s)
    .filter((name) => name && !findSkillByName(catalog.skills, name) && !existingLevels.has(customSkillId(name)));

  const draft: ProfileDraft = {
    basics: {
      fullName: profile.full_name || s(basics.fullName),
      headline: profile.headline || s(basics.headline),
      bio: profile.bio || s(p?.summary),
      location: profile.location || s(basics.location),
      university: profile.university || s(p?.university),
      degree: profile.degree || s(p?.degree),
      major: profile.major || s(p?.major),
      graduationYear: String(profile.graduation_year ?? p?.graduationYear ?? ""),
    },
    links: {
      github: profile.github_url || s(basics.github),
      linkedin: profile.linkedin_url || s(basics.linkedin),
      website: profile.website_url || s(basics.website),
    },
    educations,
    experiences,
    projects,
    skills,
    certifications,
  };
  return { draft, hidden, foundSkills: p?.skills?.length ?? 0, otherSkills };
}
