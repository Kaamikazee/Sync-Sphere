import { AnnView } from "@/components/announcement/AnnView";
import { getAnnouncementDetail, getUserGroupRole } from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";
import React from "react";

interface Params {
  params: {
    group_id: string;
    announcement_id: string;
  };
}

const page = async ({ params: { group_id, announcement_id } }: Params) => {
  const session = await checkIfUserCompleteOnboarding(
    `dashboard/groups/${group_id}/announcement/${announcement_id}`
  );

  if (!session) {
    return <p>You need to sign in to access this page.</p>;
  }

  // console.log("from Page:", announcement_id);
  

  const announcementDetail = await getAnnouncementDetail(announcement_id);
  const userRole = await getUserGroupRole(group_id, session.user.id)
  return (
    <div>
      <AnnView announcement={announcementDetail!} userRole={userRole!}/>
    </div>
  );
};

export default page;
