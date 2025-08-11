import { AddGroup } from "@/components/dashboard/group/AddGroup";
import { ShowGroups } from "@/components/dashboard/group/ShowGroups";
import { AllGroups, getAllGroups } from "@/lib/api";

export default async function AllGroupsPage() {
  const groups = await getAllGroups();

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 text-center text-white drop-shadow">
        All Groups
      </h1>

      {groups.length === 0 ? (
        <p className="text-center text-white/80 text-lg">
          No groups found.
        </p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {groups.map((group: AllGroups) => (
            <div
            data-ripple
              key={group.id}
              className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl shadow-lg p-4 sm:p-6 transition hover:scale-[1.02] hover:shadow-2xl"
            >
              <ShowGroups group={group} />
            </div>
          ))}
        </div>
      )}

      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50">
        <AddGroup />
      </div>
    </main>
  );
}
