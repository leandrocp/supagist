"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildLoginUrl } from "@/lib/auth-redirect";

/**
 * Login link that round-trips the user back to the page they came from after
 * signing in. Stays a small client island so server components like AuthButton
 * can render fully on the server while the link picks up the pathname.
 */
export function LoginLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <Link href={buildLoginUrl(pathname)} className={className}>
      {children}
    </Link>
  );
}
