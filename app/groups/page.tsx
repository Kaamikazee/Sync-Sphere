// app/groups/page.tsx

import { AddGroup } from "@/components/dashboard/group/AddGroup";
import { ShowGroups } from "@/components/dashboard/group/ShowGroups";
import { AllGroups, getAllGroups } from "@/lib/api";
import Image from "next/image";
// import Link from "next/link";

export default async function AllGroupsPage() {
    
    const groups = await getAllGroups(); // Replace with your actual fetch logic
    console.log("Fetched groups:", groups);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 text-center text-zinc-800 dark:text-white">
        All Groups
      </h1>

      {groups.length === 0 ? (
        <p className="text-center text-zinc-500">No groups found.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {groups.map((group: AllGroups) => (
            <ShowGroups key={group.id} group={group}/>
          ))}
        </div>
      )}

      <div className="fixed bottom-8 right-8">
    <div
      className="flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur-lg border border-white/20 rounded-full shadow-lg
                 transition-transform hover:scale-110 hover:shadow-2xl"
    >
      <AddGroup />
    </div>
  </div>
    </main>
  );
}
