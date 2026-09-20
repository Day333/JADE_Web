import Link from "next/link";
import { UserRoundX } from "lucide-react";
import { SignUpForm } from "@/components/sign-up-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME, SIGNUPS_OPEN } from "@/lib/config";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {SIGNUPS_OPEN ? (
          <SignUpForm />
        ) : (
          <Card>
            <CardHeader className="text-center">
              <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <UserRoundX className="h-6 w-6 text-muted-foreground" aria-hidden />
              </span>
              <CardTitle className="text-xl">Sign-ups are paused</CardTitle>
              <CardDescription>
                The {APP_NAME} beta ran alongside the Futura Remix Hackathon and new registrations are
                closed for now. Existing accounts can still sign in as usual.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/">Back to the home page</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
