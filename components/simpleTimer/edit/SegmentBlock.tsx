import { SegmentType } from "@prisma/client";
import { formatHMS } from "../BreakTimerWidget";
import { FocusAreaEditDialog } from "./FocusAreaEditDialog";
import { BreakEditDialog } from "./BreakEditDialog";

interface Props {
  start: Date;
  end: Date;
  duration: number; // in seconds
  focusAreaName: string;
  type: SegmentType;
  label?: string;
  showAddButton: boolean;
  showEditButton: boolean;
  focusAreaNamesAndIds?: { id: string; name: string }[]; // optional
  id: string;
  userId: string;
}

export const SegmentBlock = ({
  duration,
  end,
  id,
  focusAreaName,
  showAddButton,
  showEditButton,
  start,
  type,
  label,
  focusAreaNamesAndIds,
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
  const isNotRecordedBreak = isBreak && label === "NOT_RECORDED";

  const containerClass = isNotRecordedBreak
    ? "flex gap-3 p-4 rounded-2xl shadow-xl border-dashed border-2 items-start relative transition-all duration-300 group overflow-hidden bg-gradient-to-r from-yellow-50 via-yellow-100 to-yellow-50 border-yellow-300"
    : `flex gap-3 p-4 rounded-2xl shadow-xl border items-start relative transition-all duration-300 group overflow-hidden
        ${isBreak
          ? "bg-gradient-to-r from-gray-200 to-gray-300 border-gray-400"
          : "bg-gradient-to-r from-cyan-200 via-blue-100 to-indigo-200 border-white/40"}
      `;

  return (
    <div className={containerClass}>
      {/* Left Timeline Marker */}
      <div className={`w-16 text-sm ${isNotRecordedBreak ? "text-yellow-900" : "text-gray-600"} pt-1 text-right font-mono`}>
        {formatAmPm(startDate)}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <div className={`text-sm ${isNotRecordedBreak ? "text-yellow-800" : "text-gray-600"} font-medium`}>
          {formatAmPm(startDate)} ~ {formatAmPm(endDate)} ({formatHMS(duration)})
        </div>

        {isNotRecordedBreak ? (
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold text-yellow-900 tracking-wide">Unrecorded Break</div>
            <span className="ml-2 text-xs bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded-full font-medium">NOT RECORDED</span>
          </div>
        ) : (
          <div className="text-lg font-bold text-gray-800 tracking-wide">
            {isBreak ? label || "Break" : focusAreaName || "Unlabeled"}
          </div>
        )}

        <div className={`text-xs ${isNotRecordedBreak ? "text-yellow-700 italic" : "text-gray-500 italic"}`}>
          {formatHMS(duration)}
        </div>
      </div>

      {/* Buttons */}
      {(showAddButton || showEditButton || isNotRecordedBreak) && (
        <div className="flex flex-col items-center gap-2">
          {/* For NOT_RECORDED break show a more prominent add button and hide edit */}
          {(showAddButton || isNotRecordedBreak) && (
            <button className={`text-lg ${isNotRecordedBreak ? "text-yellow-900 font-semibold" : "text-blue-600"} hover:opacity-90 transition`}>
              +
            </button>
          )}

          {/* Edit / More button behaviour:
              - If it's a break (but NOT the NOT_RECORDED break) show a three-dot "more" button.
              - Otherwise show the FocusAreaEditDialog when edit is allowed.
          */}
          {showEditButton && !isNotRecordedBreak && (
            isBreak ? (
              <BreakEditDialog
                breakLabel={label!}
                segId={id}
                startTime={start}
                endTime={end}
              />
            ) : (
              <FocusAreaEditDialog
                focusAreaNamesAndIds={focusAreaNamesAndIds!}
                segId={id}
                startTime={start}
                endTime={end}
                focusAreaName={focusAreaName}
              />
            )
          )}
        </div>
      )}

      {/* Hover Glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none rounded-2xl"
        style={{
          background: isNotRecordedBreak
            ? "radial-gradient(circle at center, rgba(255,244,179,0.45), transparent 70%)"
            : "radial-gradient(circle at center, rgba(255,255,255,0.25), transparent 70%)",
        }}
      />
    </div>
  );
};
