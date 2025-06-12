import Leaderboard from "@/components/dashboard/group/leaderboard/Leaderboard";
import TotalHours from "@/components/dashboard/group/leaderboard/TotalHours";
import { InviteUsers } from "@/components/inviteUsers/InviteUsers";
import ActiveLink from "@/components/ui/active-link";
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
    getUserGroupRole(group_id, session.user.id),
  ]);

  if (!group) {
    return <p>Group not found.</p>;
  }
  console.log("User ROLE (client):`", userRole);

  // const [group, userRole] = await Promise.all([])

  return (
    <>
      <main className="font-bold text-4xl flex flex-col gap-5 text-center justify-center items-center">
        {/* <InviteUsers group={group} /> */}
        {(userRole === "ADMIN" || userRole === "OWNER") && (
          <InviteUsers group={group} />
        )}
        You are {userRole} of the group!
        <div className="p-2">
          <ActiveLink
            href={`${group_id}/members`}
            className="p-10 cursor-pointer bg-emerald-500 hover:bg-emerald-400 rounded-md"
          >
            Manage Members
          </ActiveLink>
        </div>
        <Link href={`${group_id}/chat`}>
          <div>Chat</div>
        </Link>
        <Separator />

        {/* <Leaderboard userId = {session.user.id} groupId={group_id}/> */}
        <TotalHours userId = {session.user.id} groupId={group_id}/>
      </main>
    </>
  );
};

export default Group;
