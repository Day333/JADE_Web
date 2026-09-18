import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app/page-parts";
import { JobForm } from "@/components/employer/job-form";
import { getCatalog } from "@/lib/data/catalog";
import { requireRecruiterWithCompany } from "../../_lib/data";
import { jobFormOptions } from "../../_lib/form-options";

export const metadata: Metadata = { title: "Post a Job" };

export default async function NewJobPage() {
  const { company } = await requireRecruiterWithCompany();
  const catalog = await getCatalog();
  const options = jobFormOptions(catalog);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/employer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Employer Dashboard
      </Link>
      <PageHeader
        title="Post a job"
        description="Candidates are matched against the skills you list, and seekers whose career goal matches are notified when you publish."
        className="mb-0"
      />
      <JobForm
        job={null}
        company={{ name: company.name, industry: company.industry, location: company.location }}
        skills={options.skills}
        careers={options.careers}
        gradYearOptions={options.gradYearOptions}
      />
    </div>
  );
}
