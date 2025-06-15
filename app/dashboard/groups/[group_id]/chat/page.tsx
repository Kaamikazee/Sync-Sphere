import { ChatContainer } from "@/components/chat/ChatContainer";
import { getGroupWithSubscribers } from "@/lib/api";
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
  const members = group?.subscribers

  return (
    <main className="w-full h-screen">
    <ChatContainer group_id={group_id} userId={session.user.id} userName={session.user.name!} userImage={session.user.image!}/>
    </main>
  )
};

export default Chat;
