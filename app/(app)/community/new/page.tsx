import Link from "next/link";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/app/page-parts";
import { loadCommunities } from "@/components/community/data";
import { isPostType } from "@/components/community/post-meta";
import { PostForm } from "@/components/community/post-form";
import { requireProfile } from "@/lib/auth";

export const metadata = { title: "Create post" };

const TIPS = [
  "Be specific: the company, role, timeline and what you actually did.",
  "Share what you'd tell a friend one year behind you.",
  "Leave out confidential details and other people's personal information.",
];

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ community?: string; type?: string }> }) {
  await requireProfile();
  const sp = await searchParams;
  const communities = await loadCommunities();
  const initialCommunity = communities.some((c) => c.slug === sp.community) ? sp.community! : null;
  const community = communities.find((c) => c.slug === initialCommunity);

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={community ? `/community/c/${community.slug}` : "/community"}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to {community ? community.name : "Community"}
      </Link>
      <PageHeader
        title="Create a post"
        description={
          community
            ? `Share with the ${community.name} community.`
            : "Share an experience, your career journey or a question with people on the same path."
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-xl border bg-card p-5 sm:p-6">
          <PostForm
            communities={communities.map(({ id, slug, name, kind }) => ({ id, slug, name, kind }))}
            initialCommunity={initialCommunity}
            initialType={isPostType(sp.type) ? sp.type : "experience"}
          />
        </div>
        <aside className="h-fit rounded-xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden /> Posts that help most
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {TIPS.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                {tip}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
