import React from "react";
import MenuAppBar from "@/components/ui/appbar";
import { MemberList } from "@/components/dashboard/group/members/MemberList";

interface Params {
    params: {
      group_id: string;
    };
  }
const Members = ({ params: { group_id } }: Params) => {

    
  return (
    <div>
      <MenuAppBar />
      <div className="w-full">
      {/* <ComplList /> */}
      <MemberList group_id={group_id}/>
      </div>
    </div>
  );
};

export default Members;
