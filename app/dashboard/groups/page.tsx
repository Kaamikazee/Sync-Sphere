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
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50">
        <Link
          href="/groups"
          className="flex items-center justify-center text-sm sm:text-base font-semibold text-white px-4 py-3 sm:px-5 sm:py-4 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full shadow-lg transition-transform hover:scale-110 hover:shadow-2xl"
        >
          Show Groups
        </Link>
      </div>
    </div>
  );
};

export default Groups;
