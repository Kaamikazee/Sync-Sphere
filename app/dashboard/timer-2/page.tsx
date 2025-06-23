import { getActivities, getGroups, getTodos } from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

// import TimerClient from "./TimerClient";
import TimerClient from "@/components/dashboard/timer/TimerClient";

export default async function TimerPage() {
  const session = await checkIfUserCompleteOnboarding("/dashboard/timer");
  if (!session) return null;

  const activities = await getActivities(session.user.id) || [];
  const groups = await getGroups(session.user.id)
  const todos = await getTodos(session.user.id)


  return <TimerClient activities={activities} userId={session.user.id} groups={groups} todos={todos!} />;
}
