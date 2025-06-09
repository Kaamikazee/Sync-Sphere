import React from "react";
import MenuAppBar from "@/components/ui/appbar";
// import { CirclePlusIcon } from "lucide-react";
import Link from "next/link";
import { AddGroup } from "@/components/dashboard/group/AddGroup";
import { GroupList } from "@/components/dashboard/group/GroupList";
import { MemberList } from "@/components/dashboard/group/members/MemberList";
// import { InviteUsers } from "@/components/inviteUsers/InviteUsers";

interface Params {
    params: {
      group_id: string;
    };
  }
const Members = ({ params: { group_id } }: Params) => {

    
  return (
    <div>
      <MenuAppBar href={"/dashboard/groups"} />
      <div className="w-full">
      {/* <ComplList /> */}
      <MemberList group_id={group_id}/>
      </div>
      <Link href={"#"}>
            <AddGroup />
      </Link>
    </div>
  );
};

export default Members;
