import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { PageHeader } from "@/components/app/page-parts";
import { DeleteJobButton } from "@/components/employer/delete-job-button";
import { JobForm } from "@/components/employer/job-form";
import { Button } from "@/components/ui/button";
import { getCatalog } from "@/lib/data/catalog";
import { createClient } from "@/lib/supabase/server";
import { UUID, requireRecruiterWithCompany } from "../../_lib/data";
import { jobFormOptions } from "../../_lib/form-options";

export const metadata: Metadata = { title: "Edit Job" };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { company } = await requireRecruiterWithCompany();
  const supabase = await createClient();
  const [{ data: job }, { count }, catalog] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", id).eq("company_id", company.id).maybeSingle(),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("job_id", id).neq("status", "saved"),
    getCatalog(),
  ]);
  if (!job) notFound();
  const options = jobFormOptions(catalog);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href={`/employer/jobs/${job.id}/candidates`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Candidates for {job.title}
      </Link>
      <PageHeader
        title="Edit job"
        description="Changes to skills re-rank candidates immediately."
        actions={
          <Button asChild variant="outline">
            <Link href={`/employer/jobs/${job.id}/candidates`}>
              <Users />
              Candidates
            </Link>
          </Button>
        }
        className="mb-0"
      />
      <JobForm
        job={job}
        company={{ name: company.name, industry: company.industry, location: company.location }}
        skills={options.skills}
        careers={options.careers}
        gradYearOptions={options.gradYearOptions}
      />
      <section className="flex flex-col gap-3 rounded-2xl border border-destructive/30 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Delete this job</h2>
          <p className="text-sm text-muted-foreground">Removes the listing and every application to it. This can&apos;t be undone.</p>
        </div>
        <DeleteJobButton jobId={job.id} title={job.title} applicants={count ?? 0} />
      </section>
    </div>
  );
}
