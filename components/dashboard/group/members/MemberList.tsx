import { getGroupWithSubscribers } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import MemberComp from "./MemberComp";

export const MemberList = async ({ group_id }: { group_id: string }) => {
  const session = await getAuthSession();
  if (!session) return null;
  const group = await getGroupWithSubscribers(group_id, session.user.id);
//   const groupRole = await 
// const role = group?.subscribers.
  const members = group?.subscribers
  if (!members) return <div>No members at all {}</div>
  if (members.length >= 1) {
    return (
      <div className="flex flex-col mb-9">
        {members.map((member) => (
            // member.userRole !== "OWNER" && <MemberComp key={member.user.id} member={member} role={member.userRole}/>  
            <MemberComp key={member.user.id} member={member} role={member.userRole} group_id={group_id}/>
        ))}
      </div>
    );
  } else {
    return (
      <div className="flex justify-center items-center text-4xl font-bold text-wrap p-5 m-5">
        <p className="w-[30%]">ZERO members</p>
      </div>
    );
  }
};
