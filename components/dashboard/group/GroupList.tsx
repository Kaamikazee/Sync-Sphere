import { getGroups } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import GroupComp from "./GroupComp";

export const GroupList = async () => {
  const session = await getAuthSession();
  if (!session) return null;
  const userGroups = await getGroups(session.user.id);
  if (userGroups.length >= 1) {
    return (
      <div className="flex flex-col mb-9">
        {userGroups.map((group) => (
          <GroupComp key={group.id} group={group} href="groups" />
        ))}
      </div>
    );
  } else {
    return (
      <div className="flex justify-center items-center text-4xl font-bold text-wrap p-5 m-5">
        <p className="w-[30%]">You are not joined in any group, either join one or create one.</p>
      </div>
    );
  }
};
