import { motion } from "framer-motion";

type SeenButtonProps = {
  seenCount: number;
  isOwn: boolean;
  onOpenSeenModal: () => void;
};

function formatSeenCount(n: number) {
  if (n <= 0) return "";
  return n > 99 ? "99+" : String(n);
}

function DoubleCheckIcon({ size = 20 }: { size?: number }) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size }
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="inline-block align-middle"
      >
        <path
          d="M1.5 12.5l4 4L10 10"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.5 12.5l4 4L16 9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

export function SeenButton({ seenCount, isOwn, onOpenSeenModal }: SeenButtonProps) {
  if (!isOwn) return null;

  const seen = seenCount > 0;
  const colorClass = seen ? "text-blue-500" : "text-gray-400";
  const label = seen ? `Seen by ${seenCount}` : "Not seen yet";

  return (
    <button
      onClick={onOpenSeenModal}
      title={label}
      aria-label={label}
      className="flex items-center hover:text-blue-500 transition-colors"
      type="button"
    >
      <motion.span
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.95 }}
        className={`inline-flex items-center justify-center w-5 h-5 ${colorClass}`}
        aria-hidden
      >
        <DoubleCheckIcon size={22} />
      </motion.span>

      <span className="text-[9px] text-gray-400 tabular-nums">
        {formatSeenCount(seenCount)}
      </span>
    </button>
  );
}