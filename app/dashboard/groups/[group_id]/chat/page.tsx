import { ChatContainer } from "@/components/chat/ChatContainer";
import { getGroupWithSubscribers, getUserGroupRole } from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

interface Params {
  params: {
    group_id: string;
  };
}

const Chat = async ({ params: { group_id } }: Params) => {
  const session = await checkIfUserCompleteOnboarding(
    `/dashboard/groups/${group_id}/chat`
  );
  if (!session) return null;
  const group = await getGroupWithSubscribers(group_id, session.user.id);
  // const members = group?.subscribers
  const groupName = group?.name
  const groupImage = group?.image
  const chatId = group?.chat[0].id
  const userRole = await getUserGroupRole(group_id, session.user.id)

  return (
    <main className="w-full h-screen">
    <ChatContainer group_id={group_id} groupName={groupName!} groupImage={groupImage!} userId={session.user.id} userName={session.user.name!} chatId={chatId} userRole={userRole!} />
    </main>
  )
};

export default Chat;
