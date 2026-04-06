import type { InputHTMLAttributes } from "react";
import { cn } from "../cn";

type ToggleChipProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function ToggleChip({ className, label, checked, ...props }: ToggleChipProps) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-3 rounded-full border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.04))] px-4 py-2 text-sm text-[color:var(--text-primary)] shadow-[var(--shadow-soft)] transition-[border-color,background-color,box-shadow,transform] duration-[var(--motion-fast)] ease-[var(--ease-standard)]",
        checked
          ? "border-[color:var(--border-brand)] bg-[linear-gradient(135deg,rgba(249,115,22,0.22),rgba(251,191,36,0.12))] shadow-[var(--shadow-card)]"
          : "hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.05))]",
        className,
      )}
    >
      <input type="checkbox" className="h-4 w-4 accent-[color:var(--brand-primary)]" checked={checked} {...props} />
      <span>{label}</span>
    </label>
  );
}
