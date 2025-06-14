import { getGroups } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import GroupComp from "./GroupComp";

export const GroupList = async () => {
  const session = await getAuthSession();
  if (!session) return null;
  const userGroups = await getGroups(session.user.id);
  if (userGroups.length >= 1) {
    return (
  <div className="min-h-screen px-6 py-10 bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 flex flex-col gap-6 items-center">
    {userGroups.length > 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {userGroups.map((group) => (
          <div
            key={group.id}
            className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-2xl shadow-lg p-6 transition hover:scale-[1.02] hover:shadow-2xl"
          >
            <GroupComp group={group} href="groups" />
          </div>
        ))}
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center text-white text-center p-10 rounded-2xl backdrop-blur-md bg-white/10 border border-white/20 shadow-lg w-[90%] max-w-xl">
        <p className="text-3xl sm:text-4xl font-semibold mb-4">No Groups Yet</p>
        <p className="text-lg">
          You are not joined in any group. You can either join an existing group or create your own.
        </p>
      </div>
    )}
  </div>
);

  }
};
