import { initials } from "../lib/format";

export function AvatarChip({
  name,
  src,
  size = "md",
}: {
  name?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "wechat";
}) {
  const classes =
    size === "sm"
      ? "h-9 w-9 rounded-[16px] text-sm"
      : size === "wechat"
        ? "h-12 w-12 rounded-xl text-base"
      : size === "lg"
        ? "h-14 w-14 rounded-full text-xl"
        : "h-11 w-11 rounded-full text-base";

  if (src && src.trim()) {
    return <img src={src} alt={name ?? "avatar"} className={`${classes} border border-white/80 object-cover shadow-[var(--shadow-soft)]`} />;
  }

  return (
    <div className={`${classes} flex items-center justify-center border border-white/80 bg-[var(--brand-gradient)] font-semibold text-white shadow-[var(--shadow-soft)]`}>
      {initials(name)}
    </div>
  );
}
