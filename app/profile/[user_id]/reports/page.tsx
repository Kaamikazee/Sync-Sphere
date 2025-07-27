import CalendarComp from "@/components/profile/Calendar";
import { getTotalSecondsOfUser } from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

interface Params {
  params: {
    user_id: string;
  };
}

const Reports = async ({ params: { user_id } }: Params) => {
  const session = await checkIfUserCompleteOnboarding(
    `profile/${user_id}/reports`
  );
  if (!session) {
    return <p>You need to sign in to access this page.</p>;
  }

  const totalSecondsOfUser = await getTotalSecondsOfUser(user_id)

  // const [group, userRole] = await Promise.all([
  //   getGroup(user_id, session.user.id),
  //   getUserGroupRole(user_id, session.user.id)
  // ]);
  


  // if (!group) {
  //   return <p>Group not found.</p>;
  // }


  return (
    <div>
      Reports{" "}
      {user_id}
      <CalendarComp  
      userId={user_id}
      />
    </div>
  );
};

export default Reports;
