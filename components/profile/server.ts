import "server-only";

import { buildSkillMatchers, findSkillIds, type SkillMatcher } from "@/lib/ai/skill-matcher";
import type { createClient } from "@/lib/supabase/server";
import type { Catalog } from "@/lib/types";
import { CUSTOM_SKILL_RE, customSkillId, findSkillByName, type SkillCategory } from "@/components/profile/model";
import { ValidationError, text } from "@/components/profile/validate";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const CATEGORIES: SkillCategory[] = ["technical", "tool", "domain", "soft"];

export interface SkillRequest {
  skillId?: string;
  name?: string;
  category?: SkillCategory;
}

/**
 * Turn requested skills (catalogue ids, custom ids or free-text names) into
 * valid skill ids, aligned with the requests (null when a request is empty).
 * Names that match the catalogue use the catalogue skill; anything else
 * becomes a custom skill created by the user.
 */
export async function resolveSkillIds(
  supabase: Supabase,
  userId: string,
  catalog: Catalog,
  requests: SkillRequest[],
): Promise<(string | null)[]> {
  const customs = new Map<string, { id: string; name: string; category: SkillCategory }>();
  const ids = requests.map((req): string | null => {
    const id = text(req.skillId, 80);
    const name = text(req.name, 60);
    if (id && catalog.skillById.has(id)) return id;
    const byName = name ? findSkillByName(catalog.skills, name) : undefined;
    if (byName) return byName.id;
    const customId = CUSTOM_SKILL_RE.test(id) ? id : customSkillId(name);
    if (!customId) return null;
    const displayName =
      name || customId.replace(/^custom-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    if (!customs.has(customId)) {
      const category = req.category && CATEGORIES.includes(req.category) ? req.category : "technical";
      customs.set(customId, { id: customId, name: displayName, category });
    }
    return customId;
  });
  if (customs.size > 0) {
    const { error } = await supabase.from("skills").upsert(
      [...customs.values()].map((c) => ({ ...c, is_custom: true, created_by: userId })),
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (error) throw new ValidationError("We couldn't save one of your custom skills. Please try again.");
  }
  return ids;
}

let matcherCache: { catalog: Catalog; matchers: SkillMatcher[] } | null = null;

/** Skills an experience or project demonstrates: the given ids plus skills mentioned in its text. */
export function skillsFromText(catalog: Catalog, given: string[], ...texts: (string | null | undefined)[]) {
  if (matcherCache?.catalog !== catalog) matcherCache = { catalog, matchers: buildSkillMatchers(catalog.skills) };
  const found = findSkillIds(texts.filter(Boolean).join("\n"), matcherCache.matchers);
  const valid = given.filter((id) => catalog.skillById.has(id) || CUSTOM_SKILL_RE.test(id));
  return [...new Set([...valid, ...found])];
}

/** Names for custom skills (not in the cached catalogue). */
export async function customSkillNames(supabase: Supabase, catalog: Catalog, ids: string[]) {
  const missing = [...new Set(ids.filter((id) => !catalog.skillById.has(id)))];
  const names = new Map<string, { name: string; category: SkillCategory }>();
  if (missing.length === 0) return names;
  const { data } = await supabase.from("skills").select("id, name, category").in("id", missing);
  for (const row of data ?? []) names.set(row.id, { name: row.name, category: row.category });
  return names;
}
