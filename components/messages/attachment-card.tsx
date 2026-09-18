import Link from "next/link";
import { ExternalLink, FileText, FolderGit2, Globe, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageAttachment } from "@/lib/types";

const META: Record<MessageAttachment["type"], { label: string; icon: typeof FileText }> = {
  resume: { label: "Resume", icon: FileText },
  portfolio: { label: "Portfolio", icon: Globe },
  project: { label: "Project", icon: FolderGit2 },
  profile: { label: "Career Profile", icon: UserRound },
};

export function isAttachment(value: unknown): value is MessageAttachment {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.type === "string" && v.type in META && typeof v.label === "string";
}

/** Small card for a resume / portfolio / project / profile shared in chat. */
export function AttachmentCard({
  attachment,
  mine,
  className,
}: {
  attachment: MessageAttachment;
  mine: boolean;
  className?: string;
}) {
  const meta = META[attachment.type];
  const Icon = meta.icon;
  const url = attachment.url;
  const external = !!url && /^https?:\/\//i.test(url);
  const hint =
    attachment.type === "resume"
      ? mine
        ? "They can open it if your resume is shared with them"
        : "Opens if the owner has shared it with you"
      : external
        ? (() => {
            try {
              return new URL(url!).hostname.replace(/^www\./, "");
            } catch {
              return url;
            }
          })()
        : attachment.type === "profile"
          ? "Skills, projects & Career Journey"
          : "Opens on JADE";

  const content = (
    <>
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          mine ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[10px] font-semibold uppercase tracking-wide", mine ? "text-white/80" : "text-muted-foreground")}>
          {meta.label}
        </span>
        <span className="block truncate text-sm font-medium">{attachment.label}</span>
        {hint && <span className={cn("block truncate text-xs", mine ? "text-white/75" : "text-muted-foreground")}>{hint}</span>}
      </span>
      {url && <ExternalLink className={cn("h-3.5 w-3.5 shrink-0", mine ? "text-white/80" : "text-muted-foreground")} aria-hidden />}
    </>
  );

  const classes = cn(
    "flex w-64 max-w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors",
    mine ? "border-white/25 bg-white/10 hover:bg-white/15" : "bg-background hover:bg-accent",
    className,
  );

  if (!url) return <div className={classes}>{content}</div>;
  // Resumes open a file (possibly a download), so use a plain link in a new tab.
  if (external || attachment.type === "resume") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={classes}>
        {content}
      </a>
    );
  }
  return (
    <Link href={url} className={classes}>
      {content}
    </Link>
  );
}
