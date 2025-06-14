import { AnnouncementContainer } from "@/components/announcement/AnnouncementContainer";
import { getAnnouncements, getUserGroupRole } from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

interface Params {
  params: {
    group_id: string;
  };
}

const Announcement = async ({ params: { group_id } }: Params) => {
  const session = await checkIfUserCompleteOnboarding(
    `/dashboard/groups/${group_id}/chat`
);
if (!session) return null;
    const announcements = await getAnnouncements(group_id)
    const userRole = await getUserGroupRole(group_id, session.user.id)
  return (
    <div>
        <AnnouncementContainer announcements={announcements!} groupId={group_id} userRole={userRole!} />
    </div>
  );
};

export default Announcement;
