import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ConsentForm } from "./consent-form";

export const metadata: Metadata = {
  title: "Authorize an app · Supagist",
  robots: { index: false, follow: false },
};

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string | string[] }>;
}) {
  const { authorization_id } = await searchParams;
  const id = typeof authorization_id === "string" ? authorization_id : "";
  return (
    <AuthShell>
      <ConsentForm key={id} authorizationId={id} />
    </AuthShell>
  );
}
