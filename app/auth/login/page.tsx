import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { safeNextPath } from "@/lib/auth-redirect";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const { next } = await searchParams;
  const target = safeNextPath(next);
  return (
    <AuthShell>
      <LoginForm next={target} />
    </AuthShell>
  );
}
