import Link from "next/link";
import { POST_TYPES, POST_TYPE_ICONS } from "@/components/community/post-meta";
import { POST_TYPE_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PostType } from "@/lib/types";

/** Horizontally scrollable post-type chips that link to `?type=`. */
export function TypeFilter({
  basePath,
  active,
  params = {},
}: {
  basePath: string;
  active: PostType | null;
  params?: Record<string, string | undefined>;
}) {
  const hrefFor = (type: PostType | null) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
    if (type) search.set("type", type);
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const chip = "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors";
  return (
    <nav aria-label="Filter by post type" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex w-max gap-2 pb-1 sm:w-auto sm:flex-wrap">
        <Link
          href={hrefFor(null)}
          scroll={false}
          aria-current={active === null ? "true" : undefined}
          className={cn(chip, active === null ? "border-emerald-600 bg-emerald-600 text-white" : "bg-background hover:bg-accent")}
        >
          All posts
        </Link>
        {POST_TYPES.map((type) => {
          const Icon = POST_TYPE_ICONS[type];
          const isActive = active === type;
          return (
            <Link
              key={type}
              href={hrefFor(type)}
              scroll={false}
              aria-current={isActive ? "true" : undefined}
              className={cn(chip, isActive ? "border-emerald-600 bg-emerald-600 text-white" : "bg-background hover:bg-accent")}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {POST_TYPE_LABELS[type]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
