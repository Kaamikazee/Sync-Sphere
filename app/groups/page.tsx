// app/groups/page.tsx

import { AddGroup } from "@/components/dashboard/group/AddGroup";
import { AllGroups, getAllGroups } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";

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
            <Link
              href={`/groups/${group.id}`}
              key={group.id}
              className="bg-white dark:bg-zinc-800 rounded-xl shadow p-4 hover:shadow-md transition"
            >
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-700">
                  {group.image ? (
                    <Image
                      src={group.image}
                      alt={group.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-purple-500 text-white font-bold text-xl">
                      {group.name?.[0] || "G"}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {group.name}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    {/* {group.description?.slice(0, 60) || "No description"} */}
                    No description
                  </p>
                  <p className="text-xs mt-1 text-zinc-400">
                    {group.subscribersCount || 0} members
                  </p>
                </div>
              </div>
            </Link>
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
