import { SegmentType } from "@prisma/client";

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

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  const isBreak = type === "BREAK";

  return (
    <div
      className={`flex gap-2 p-2 mb-3 rounded-xl shadow-md border items-start relative transition-all duration-300 
        ${isBreak
          ? "bg-gray-100 border-gray-300"
          : "bg-gradient-to-r from-cyan-100 via-blue-50 to-indigo-100 border-white/30"}
      `}
    >
      {/* Left Timeline Marker */}
      <div className="w-14 text-xs text-gray-500 pt-1 text-right">
        {formatAmPm(startDate)}
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="text-xs text-gray-500 font-medium">
          {formatAmPm(startDate)} ~ {formatAmPm(endDate)} ({formatDuration(duration)})
        </div>

        <div className="text-base font-semibold text-gray-800">
          {isBreak ? label || "Break" : focusAreaName || "Unlabeled"}
        </div>

        <div className="text-sm text-gray-500">{formatDuration(duration)}</div>
      </div>

      {/* Buttons */}
      {(showAddButton || showEditButton) && (
        <div className="flex flex-col items-center gap-1">
          {showAddButton && (
            <button className="text-xs text-blue-500 hover:underline">+</button>
          )}
          {showEditButton && (
            <button className="text-xs text-gray-600 hover:text-black">⋮</button>
          )}
        </div>
      )}
    </div>
  );
};
