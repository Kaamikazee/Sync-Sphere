import { getGroups } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import GroupComp from "./GroupComp";

export default async function GroupList() {
  const session = await getAuthSession();
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white px-4 text-center">
        <p className="text-lg sm:text-xl font-medium">
          You must be signed in to view your groups.
        </p>
      </div>
    );
  }

  const userGroups = await getGroups(session.user.id);

  return (
    <div className="min-h-screen px-4 sm:px-6 py-8 sm:py-10 bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 flex flex-col gap-6 items-center">
      {userGroups.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-6xl">
          {userGroups.map((group) => (
            <div
            data-ripple
              key={group.id}
              className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl shadow-lg p-4 sm:p-6 transition hover:scale-[1.02] hover:shadow-2xl"
            >
              <GroupComp group={group} SessionUserId={session.user.id} href="groups" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-white text-center px-4 py-8 sm:py-10 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg w-full max-w-xl">
          <p className="text-2xl sm:text-3xl font-semibold mb-3">No Groups Yet</p>
          <p className="text-base sm:text-lg">
            You are not joined in any group. You can either join an existing group or create your own.
          </p>
        </div>
      )}
    </div>
  );
}
