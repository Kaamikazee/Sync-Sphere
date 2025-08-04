import { AddGroup } from "@/components/dashboard/group/AddGroup";
import { DeleteGroup } from "@/components/dashboard/group/DeleteGroup";
import { NewLeaderboard } from "@/components/dashboard/group/leaderboard/NewLeaderboard";
import { LeaveGroup } from "@/components/dashboard/group/LeaveGroup";
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 py-8">
        {/* Page Header */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-800">
            Group Dashboard
          </h1>
        </header>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center items-center gap-4">
          {(userRole === "ADMIN" || userRole === "OWNER") && (
            <InviteUsers group={group} />
          )}

          <ActiveLink
            href={`${group_id}/members`}
            className="w-full sm:w-auto text-center px-6 py-2 bg-gradient-to-r from-green-400 via-lime-400 to-emerald-500 hover:from-green-300 hover:via-lime-300 hover:to-emerald-400 text-white rounded-full shadow-md hover:shadow-2xl hover:scale-105 transition-transform duration-300"
          >
            Manage Members
          </ActiveLink>

          <Link href={`${group_id}/chat`} className="w-full sm:w-auto">
            <div className="text-center px-6 py-2 bg-gradient-to-r from-cyan-500/40 via-sky-500/30 to-indigo-600/40 hover:from-cyan-400/40 hover:via-sky-400/30 hover:to-indigo-500/40 text-white rounded-full shadow-md hover:shadow-2xl hover:scale-105 transition-transform duration-300">
              Chat Room
            </div>
          </Link>

          <Link href={`${group_id}/announcement`} className="w-full sm:w-auto">
            <div className="text-center px-6 py-2 bg-gradient-to-r from-rose-500 via-red-500 to-orange-400 hover:from-rose-400 hover:via-red-400 hover:to-orange-300 text-white rounded-full shadow-md hover:shadow-2xl hover:scale-105 transition-transform duration-300">
              Announcement
            </div>
          </Link>

          {/* Leave Group */}
          {userRole === "OWNER" ? (
            <DeleteGroup groupId={group_id} />
          ) : (
            <LeaveGroup userId={session.user.id} groupId={group_id} />
          )}
        </div>

        {/* Edit Group Floating Button (Admin/Owner only) */}
        {(userRole === "ADMIN" || userRole === "OWNER") && (
          <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50">
            <AddGroup update />
          </div>
        )}

        <Separator className="border-gray-300" />

        {/* Leaderboard Section */}
        <section className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
            Leaderboard
          </h2>
          <NewLeaderboard
            uuserId={session.user.id}
            groupId={group_id}
            groupName={group.name}
            uuserName={session.user.name}
          />
        </section>
      </div>
    </main>
  </>
);

};

export default Group;
