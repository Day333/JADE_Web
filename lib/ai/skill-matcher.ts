import type { Skill } from "@/lib/types";

interface SkillPattern {
  regex: RegExp;
  /** Very short case-sensitive aliases (R, Go) are only trusted in a skills list. */
  skillsListOnly: boolean;
}

export interface SkillMatcher {
  id: string;
  patterns: SkillPattern[];
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}

/**
 * Compile alias patterns for every skill. Aliases match on word boundaries,
 * case-insensitively; an alias prefixed with "=" is case-sensitive.
 */
export function buildSkillMatchers(skills: Pick<Skill, "id" | "name" | "aliases">[]): SkillMatcher[] {
  return skills.map((skill) => {
    const raw = new Set<string>(skill.aliases);
    if (skill.name.length > 2) raw.add(skill.name);
    const patterns = [...raw].filter(Boolean).map((alias) => {
      const caseSensitive = alias.startsWith("=");
      const text = caseSensitive ? alias.slice(1) : alias;
      return {
        regex: new RegExp(`(?<![A-Za-z0-9])${escapeRegex(text)}(?![A-Za-z0-9])`, caseSensitive ? "g" : "gi"),
        skillsListOnly: caseSensitive && text.length <= 2,
      };
    });
    return { id: skill.id, patterns };
  });
}

/**
 * Count mentions of each skill in `text`. `isSkillsList` enables the short
 * aliases that are too ambiguous in free text.
 */
export function countSkillMentions(
  text: string,
  matchers: SkillMatcher[],
  isSkillsList = false,
): Map<string, number> {
  const counts = new Map<string, number>();
  if (!text) return counts;
  for (const matcher of matchers) {
    let total = 0;
    for (const pattern of matcher.patterns) {
      if (pattern.skillsListOnly && !isSkillsList) continue;
      pattern.regex.lastIndex = 0;
      const found = text.match(pattern.regex);
      if (found) total += found.length;
    }
    if (total > 0) counts.set(matcher.id, total);
  }
  return counts;
}

/** Skill ids mentioned at least once in the text. */
export function findSkillIds(text: string, matchers: SkillMatcher[], isSkillsList = false): string[] {
  return [...countSkillMentions(text, matchers, isSkillsList).keys()];
}
