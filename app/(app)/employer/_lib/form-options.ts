import "server-only";

import type { CareerOption } from "@/components/employer/job-form";
import type { SkillOption } from "@/components/employer/skill-picker";
import type { Catalog } from "@/lib/types";

/** Serializable catalogue data for the job form's pickers. */
export function jobFormOptions(catalog: Catalog) {
  const skills: SkillOption[] = catalog.skills
    .filter((s) => !s.is_custom)
    .map((s) => ({ id: s.id, name: s.name, category: s.category, aliases: s.aliases }));
  const careers: CareerOption[] = catalog.careers.map((c) => {
    const reqs = catalog.requirementsByCareer.get(c.id) ?? [];
    return {
      id: c.id,
      title: c.title,
      field: c.field,
      core: reqs.filter((r) => r.importance === 3).map((r) => r.skill_id),
      important: reqs.filter((r) => r.importance === 2).map((r) => r.skill_id),
    };
  });
  const year = new Date().getFullYear();
  const gradYearOptions = [year - 1, year, year + 1, year + 2, year + 3];
  return { skills, careers, gradYearOptions };
}
