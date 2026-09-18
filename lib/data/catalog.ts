import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Career, CareerSkill, Catalog, Skill } from "@/lib/types";

// Reference data is public, so it can be fetched without the user's cookies
// and shared across requests.
const fetchCatalogRows = unstable_cache(
  async () => {
    const supabase = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    const [skills, careers, careerSkills] = await Promise.all([
      supabase.from("skills").select("*").order("name"),
      supabase.from("careers").select("*").order("title"),
      supabase.from("career_skills").select("*"),
    ]);
    if (skills.error || careers.error || careerSkills.error) {
      throw new Error("Failed to load the career catalogue");
    }
    return { skills: skills.data, careers: careers.data, careerSkills: careerSkills.data };
  },
  ["catalog-v1"],
  { revalidate: 3600, tags: ["catalog"] },
);

export function buildCatalog(skills: Skill[], careers: Career[], careerSkills: CareerSkill[]): Catalog {
  const requirementsByCareer = new Map<string, CareerSkill[]>();
  for (const req of careerSkills) {
    const list = requirementsByCareer.get(req.career_id) ?? [];
    list.push(req);
    requirementsByCareer.set(req.career_id, list);
  }
  for (const list of requirementsByCareer.values()) {
    list.sort((a, b) => b.importance - a.importance || b.target_level - a.target_level);
  }
  return {
    skills,
    careers,
    careerSkills,
    skillById: new Map(skills.map((s) => [s.id, s])),
    careerById: new Map(careers.map((c) => [c.id, c])),
    requirementsByCareer,
  };
}

/** Skills, careers and career requirements. */
export const getCatalog = cache(async (): Promise<Catalog> => {
  const rows = await fetchCatalogRows();
  // Custom skills created by users are not in the cached rows; they are
  // resolved on demand with skillName().
  return buildCatalog(rows.skills, rows.careers, rows.careerSkills);
});

/** Display name for a skill id, falling back to a readable version of the id. */
export function skillName(catalog: Catalog, skillId: string) {
  return (
    catalog.skillById.get(skillId)?.name ??
    skillId.replace(/^custom-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
