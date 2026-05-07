import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { nameToColor, nameToInitials } from "@/lib/presence-utils";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "default" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  xs: "size-3.5 text-[8px]",
  sm: "size-5 text-[10px]",
  default: "size-8 text-sm",
  lg: "size-10 text-base",
};

/**
 * Project-wide avatar: GitHub image when the user has one, colored circle
 * with initials otherwise. Wraps shadcn `<Avatar>` so we get its lazy/error
 * fallback handling without re-implementing it everywhere.
 */
export function UserAvatar({
  username,
  avatarUrl,
  size = "sm",
  className,
}: {
  username: string;
  avatarUrl?: string | null;
  size?: Size;
  className?: string;
}) {
  return (
    <Avatar className={cn(SIZE_CLASS[size], className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={username} /> : null}
      <AvatarFallback
        className="rounded-full font-semibold text-white"
        style={{ backgroundColor: nameToColor(username) }}
      >
        {nameToInitials(username)}
      </AvatarFallback>
    </Avatar>
  );
}
