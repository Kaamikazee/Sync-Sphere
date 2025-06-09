import React from "react";
import MenuAppBar from "@/components/ui/appbar";
import { CirclePlusIcon } from "lucide-react";
import Link from "next/link";
import { AddGroup } from "@/components/dashboard/group/AddGroup";
import { GroupList } from "@/components/dashboard/group/GroupList";
import { InviteUsers } from "@/components/inviteUsers/InviteUsers";

const Groups = () => {
    
  return (
    <div>
      <MenuAppBar href={"/dashboard/groups"} />
      <div className="w-full">
      <GroupList />
      </div>
      <Link href={"#"}>
            <AddGroup />
      </Link>
    </div>
  );
};

export default Groups;
