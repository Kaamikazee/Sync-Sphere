// import CalendarComp from "@/components/profile/Calendar";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";
import Reports from "./Reports";

interface Params {
  params: {
    user_id: string;
  };
}

const ReportsContainer = async ({ params: { user_id } }: Params) => {
  const session = await checkIfUserCompleteOnboarding(
    `profile/${user_id}/reports`
  );
  if (!session) {
    return <p>You need to sign in to access this page.</p>;
  }

  return (
    <div>
      <Reports
        user_id={user_id}
        user_timezone={session.user.timezone || "Asia/Kolkata"}
        // timezone={session.user.timezone || "Asia/Kolkata"}
        // resetHour={session.user.resetHour || 0}
      />
    </div>
  );
};

export default ReportsContainer;
