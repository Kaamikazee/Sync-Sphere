import PomodoroContainer from "@/components/dashboard/pomodoro/PomodoroContainer";
import { ActiTimerComp } from "@/components/dashboard/timer/ActiTimerComp";
import { CreateActivity } from "@/components/dashboard/timer/CreateActivity";
import { getActivities } from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

// import TimerClient from "./TimerClient";
import TimerClient from "@/components/dashboard/timer/TimerClient";

export default async function TimerPage() {
  const session = await checkIfUserCompleteOnboarding("/dashboard/timer");
  if (!session) return null;

  const activities = await getActivities(session.user.id) || [];

  return <TimerClient activities={activities} />;
}
