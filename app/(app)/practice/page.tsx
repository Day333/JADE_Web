import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { ForYouLabel } from "@/components/app/match";
import { PageHeader } from "@/components/app/page-parts";
import { PracticeList } from "@/components/growth/practice-list";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { loadPractice } from "@/lib/data/growth";

export const metadata: Metadata = { title: "Interview Practice" };

export default async function PracticePage() {
  const profile = await requireProfile({ role: "seeker" });
  const { questions, doneIds } = await loadPractice(profile.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<ForYouLabel>Interview Practice</ForYouLabel>}
        title="Practise real interview questions"
        description="Read the question, answer it out loud as if you were in the room, then compare with the model answer. Every question you tick shows up on your progress heatmap."
        actions={
          <Button asChild variant="outline">
            <Link href="/progress">
              <TrendingUp aria-hidden /> My Progress
            </Link>
          </Button>
        }
      />
      <PracticeList questions={questions} doneIds={[...doneIds]} />
    </div>
  );
}
