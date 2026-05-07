import { LoginForm } from "@/components/login-form";
import { safeNextPath } from "@/lib/auth-redirect";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const { next } = await searchParams;
  const target = safeNextPath(next);
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <LoginForm next={target} />
    </div>
  );
}
