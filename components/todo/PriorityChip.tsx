import React from "react";

type Priority = "NONE" | "LOW" | "MEDIUM" | "HIGH";

const PRIORITY_META: Record<
  Priority,
  { label: string; pillClass: string; dotClass: string }
> = {
  NONE: { label: "None", pillClass: "bg-white/10 text-white/80", dotClass: "bg-white/40" },
  LOW: { label: "Low", pillClass: "bg-emerald-600 text-white", dotClass: "bg-emerald-300" },
  MEDIUM: { label: "Medium", pillClass: "bg-yellow-400 text-black", dotClass: "bg-yellow-300" },
  HIGH: { label: "High", pillClass: "bg-red-500 text-white", dotClass: "bg-red-400" },
};

export function PriorityChip({
  value,
  onChange,
  small = false,
  active = false,
  className = "",
}: {
  value: Priority;
  onChange?: (p: Priority) => void;
  small?: boolean;
  active?: boolean;
  className?: string;
}) {
  const meta = PRIORITY_META[value];

  return (
    <button
      type="button"
      onClick={() => onChange?.(value)}
      title={`Priority: ${meta.label}. Click to set.`}
      className={`inline-flex items-center gap-2
         ${small ? "text-xs px-2 py-0.5 rounded-full" : "text-sm px-3 py-1 rounded-lg"}
         ${active ? `ring-2 ring-offset-1 ring-white/20 ${meta.pillClass}` : `bg-white/6 text-white/80`}
         transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-white/20 ${className}`}
      aria-pressed={active}
      aria-label={meta.label}
    >
      <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} aria-hidden />
      <span className="font-medium truncate">{small ? meta.label[0] : meta.label}</span>
    </button>
  );
}
