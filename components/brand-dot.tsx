export function BrandDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={
        "size-2 rounded-full bg-brand shadow-[0_0_12px_hsl(var(--brand)/0.6)]" +
        (className ? ` ${className}` : "")
      }
    />
  );
}
