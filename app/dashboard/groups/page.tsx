import React from "react";
import MenuAppBar from "@/components/ui/appbar";
// import { AddGroup } from "@/components/dashboard/group/AddGroup";
import { GroupList } from "@/components/dashboard/group/GroupList";
import Link from "next/link";

const Groups = () => {
    
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600">
  {/* Top nav bar */}
  <MenuAppBar />

  {/* Main content */}
  <main className="flex-1 px-6 py-8">
    <div className="w-full max-w-6xl mx-auto">
      <GroupList />
    </div>
  </main>

  {/* Floating “Add Group” button */}
  <div className="fixed bottom-8 right-8">
    <Link
      href="/groups"
      className="flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full shadow-lg
                 transition-transform hover:scale-110 hover:shadow-2xl"
    >
      {/* <ShowGroups /> */}
      Show Groups
      {/* <AddGroup /> */}
    </Link>
  </div>
</div>

  );
};

export default Groups;
