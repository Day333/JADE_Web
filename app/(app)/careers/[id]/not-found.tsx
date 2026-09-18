import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/app/page-parts";
import { Button } from "@/components/ui/button";

export default function CareerNotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="We could not find that career"
      description="It may have been renamed or removed from the catalogue. Explore the careers recommended for you instead."
      action={
        <Button asChild>
          <Link href="/careers">Explore careers</Link>
        </Button>
      }
    />
  );
}
