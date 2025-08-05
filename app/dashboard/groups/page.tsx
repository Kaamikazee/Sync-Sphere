import React from "react";
import MenuAppBar from "@/components/ui/appbar";
import Link from "next/link";
import GroupList from "@/components/dashboard/group/GroupList";

const Groups = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600">
      {/* Top nav bar */}
      <MenuAppBar />

      {/* Main content */}
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
        <div className="w-full max-w-6xl mx-auto">
          <GroupList />
        </div>
      </main>

      {/* Floating “Show Groups” button */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 flex flex-col items-center group">
  {/* Circle Icon Button */}
  <Link
    href="/groups"
    className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-full shadow-xl transition-transform hover:scale-110 hover:shadow-2xl"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6 sm:w-7 sm:h-7"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  </Link>

  {/* Mobile: Always-visible label */}
  <div className="mt-1 text-[10px] sm:hidden text-white/80">Show Groups</div>

  {/* Desktop: Tooltip on hover */}
  <div className="absolute bottom-full mb-2 hidden sm:block opacity-0 group-hover:opacity-100 text-xs text-white bg-black/60 px-2 py-1 rounded-md shadow transition-opacity">
    Show Groups
  </div>
</div>

    </div>
  );
};

export default Groups;
