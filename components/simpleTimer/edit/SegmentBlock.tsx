import { SegmentType } from "@prisma/client";
import { formatHMS } from "../BreakTimerWidget";

interface Props {
  start: Date;
  end: Date;
  duration: number; // in seconds
  focusAreaName: string;
  type: SegmentType;
  label?: string;
  showAddButton: boolean;
  showEditButton: boolean;
}

export const SegmentBlock = ({
  duration,
  end,
  focusAreaName,
  showAddButton,
  showEditButton,
  start,
  type,
  label,
}: Props) => {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;

  const formatAmPm = (date: Date | null) => {
    return date
      ? date.toLocaleString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : "--:--";
  };

  const isBreak = type === "BREAK";

  return (
    <div
      className={`flex gap-3 p-4 rounded-2xl shadow-xl border items-start relative transition-all duration-300 group overflow-hidden
        ${isBreak
          ? "bg-gradient-to-r from-gray-200 to-gray-300 border-gray-400"
          : "bg-gradient-to-r from-cyan-200 via-blue-100 to-indigo-200 border-white/40"}
      `}
    >
      {/* Left Timeline Marker */}
      <div className="w-16 text-sm text-gray-600 pt-1 text-right font-mono">
        {formatAmPm(startDate)}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <div className="text-sm text-gray-600 font-medium">
          {formatAmPm(startDate)} ~ {formatAmPm(endDate)} ({formatHMS(duration)})
        </div>

        <div className="text-lg font-bold text-gray-800 tracking-wide">
          {isBreak ? label || "Break" : focusAreaName || "Unlabeled"}
        </div>

        <div className="text-xs text-gray-500 italic">{formatHMS(duration)}</div>
      </div>

      {/* Buttons */}
      {(showAddButton || showEditButton) && (
        <div className="flex flex-col items-center gap-2">
          {showAddButton && (
            <button className="text-sm text-blue-600 hover:text-blue-800 transition">+</button>
          )}
          {showEditButton && (
            <button className="text-sm text-gray-600 hover:text-black transition">⋮</button>
          )}
        </div>
      )}

      {/* Hover Glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none rounded-2xl" style={{
        background:
          "radial-gradient(circle at center, rgba(255,255,255,0.25), transparent 70%)"
      }} />
    </div>
  );
};
