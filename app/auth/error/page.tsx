import Link from "next/link";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth-heading";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";

async function ErrorContent({ searchParams }: { searchParams: Promise<{ error: string }> }) {
  const params = await searchParams;

  return params?.error ? <>Code error: {params.error}</> : <>An unspecified error occurred.</>;
}

export default function Page({ searchParams }: { searchParams: Promise<{ error: string }> }) {
  return (
    <AuthShell>
      <div className="flex flex-col gap-8">
        <AuthHeading eyebrow="Sign-in error" title="Sorry, something went wrong.">
          <Suspense>
            <ErrorContent searchParams={searchParams} />
          </Suspense>
        </AuthHeading>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/auth/login">Try signing in again</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Back to Supagist</Link>
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
