import { NewLeaderboard } from "@/components/dashboard/group/leaderboard/NewLeaderboard";
import { InviteUsers } from "@/components/inviteUsers/InviteUsers";
import ActiveLink from "@/components/ui/active-link";
import MenuAppBar from "@/components/ui/appbar";
import { Separator } from "@/components/ui/separator";
import { getGroup, getUserGroupRole } from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";
import Link from "next/link";
// import Link from "next/link";

interface Params {
  params: {
    group_id: string;
  };
}

const Group = async ({ params: { group_id } }: Params) => {
  const session = await checkIfUserCompleteOnboarding(
    `dashboard/groups/${group_id}`
  );
  if (!session) {
    return <p>You need to sign in to access this page.</p>;
  }

  const [group, userRole] = await Promise.all([
    getGroup(group_id, session.user.id),
    getUserGroupRole(group_id, session.user.id)
  ]);
  


  if (!group) {
    return <p>Group not found.</p>;
  }


  return (
    <>
    <MenuAppBar />
      <main className="min-h-screen bg-gradient-to-br from-purple-500/30 via-blue-400/30 to-indigo-500/30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Header */}
          <header className="text-center space-y-2">
            <h1 className="text-5xl font-extrabold text-gray-800">
              Group Dashboard
            </h1>
            <p className="text-lg text-gray-600">
              You are{" "}
              <span className="font-semibold text-indigo-600">{userRole}</span>{" "}
              of this group
            </p>
          </header>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            {(userRole === "CAN_EDIT" || userRole === "OWNER") && (
              <InviteUsers group={group} />
            )}

            <ActiveLink
              href={`${group_id}/members`}
              className="px-6 py-2 bg-gradient-to-r from-green-400 via-lime-400 to-emerald-500 hover:bg-gradient-to-r hover:from-green-300 hover:via-lime-300 hover:to-emerald-400 text-white rounded-full shadow-md hover:shadow-2xl hover:scale-105 transition-transform duration-300 cursor-pointer"
            >
              <span>Manage Members</span>
            </ActiveLink>

            <Link href={`${group_id}/chat`}>
              <div className="px-6 py-2 bg-gradient-to-r from-cyan-500/40 via-sky-500/30 to-indigo-600/40 hover:bg-gradient-to-r hover:from-cyan-400/40 hover:via-sky-400/30 hover:to-indigo-500/40 text-white rounded-full shadow-md hover:shadow-2xl hover:scale-105 transition-transform duration-300 cursor-pointer">
                Chat Room
              </div>
            </Link>

            <Link href={`${group_id}/announcement`}>
              <div className="px-6 py-2 bg-gradient-to-r from-rose-500 via-red-500 to-orange-400 hover:bg-gradient-to-r hover:from-rose-400 hover:via-red-400 hover:to-orange-300 text-white rounded-full shadow-md hover:shadow-2xl hover:scale-105 transition-transform duration-300 cursor-pointer">
                Announcement
              </div>
            </Link>
          </div>

          <Separator className="border-gray-300" />

          {/* Leaderboard Section */}
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Leaderboard
            </h2>
            <NewLeaderboard uuserId={session.user.id} groupId={group_id} uuserName={session.user.name}/>
          </section>
        </div>
      </main>
    </>
  );
};

export default Group;
