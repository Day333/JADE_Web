"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Users } from "lucide-react";
import { FollowButton } from "@/components/app/social-buttons";
import { COMMUNITY_KINDS, COMMUNITY_KIND_ICONS, COMMUNITY_KIND_LABELS } from "@/components/community/post-meta";
import { cn } from "@/lib/utils";
import type { CommunityKind } from "@/lib/types";

export interface DirectoryItem {
  /** Follow target id (community id, or company id for companies without a community). */
  id: string;
  followType: "community" | "company";
  kind: CommunityKind;
  name: string;
  href: string;
  members: number;
  following: boolean;
  badge?: string | null;
}

export function CommunityRow({ item }: { item: DirectoryItem }) {
  const Icon = COMMUNITY_KIND_ICONS[item.kind];
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <Link href={item.href} className="block truncate text-sm font-medium hover:underline">
          {item.name}
        </Link>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
            <Users className="h-3 w-3" aria-hidden />
            {item.members} {item.members === 1 ? "member" : "members"}
          </span>
          {item.badge && <span className="min-w-0 truncate font-medium text-emerald-600 dark:text-emerald-400">· {item.badge}</span>}
        </p>
      </div>
      <FollowButton
        targetType={item.followType}
        targetId={item.id}
        initialFollowing={item.following}
        variant={item.following ? "secondary" : "outline"}
      />
    </li>
  );
}

/** Career / Company / University / Topic communities with member counts. */
export function CommunityDirectory({ items, initialKind = "career" }: { items: DirectoryItem[]; initialKind?: CommunityKind }) {
  const [kind, setKind] = useState<CommunityKind>(initialKind);
  const [expanded, setExpanded] = useState(false);
  const list = items.filter((i) => i.kind === kind);
  const visible = expanded ? list : list.slice(0, 5);
  return (
    <div>
      <div role="tablist" aria-label="Community type" className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
        {COMMUNITY_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => {
              setKind(k);
              setExpanded(false);
            }}
            className={cn(
              "rounded-md px-1 py-1 text-xs font-medium text-muted-foreground transition-colors",
              kind === k && "bg-background text-foreground shadow",
            )}
          >
            {COMMUNITY_KIND_LABELS[k]}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No {COMMUNITY_KIND_LABELS[kind].toLowerCase()} communities yet.</p>
      ) : (
        <ul className="mt-2 divide-y">
          {visible.map((item) => (
            <CommunityRow key={`${item.followType}-${item.id}`} item={item} />
          ))}
        </ul>
      )}
      {list.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          {expanded ? "Show fewer" : `Show all ${list.length}`}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} aria-hidden />
        </button>
      )}
    </div>
  );
}
