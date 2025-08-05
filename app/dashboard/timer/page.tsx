export const dynamic = "force-dynamic";
import { SimpleTimerContainer } from "@/components/simpleTimer/SimpleTimer";
import {
  getFocusAreas,
  // getFocusAreaTotals,
  getGroups,
  getTodos,
  getTotalSecondsOfUser,
  getUserPomodoroSettings,
} from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

const SimpleTimer = async () => {
  const session = await checkIfUserCompleteOnboarding("/dashboard/timer");
  if (!session) return null;

  const totalSecondsOfUser = await getTotalSecondsOfUser(session.user.id);
  // const total = totalSecondsOfUser?.totalSeconds
  const groups = await getGroups(session.user.id);
  const startTime = totalSecondsOfUser?.startTimestamp;
  const isRunning = totalSecondsOfUser?.isRunning;

  const focusAreas = await getFocusAreas(session.user.id);
  // const timeSpentOfFA = await getFocusAreaTotals(session.user.id)
  const pomodoroSettings = await getUserPomodoroSettings(session?.user.id);

  const todos = await getTodos(session.user.id);

  /* 
 totalSeconds, // Need to fetch day wise
  timeSpentOfFA: focusAreaTotals, // Need to fetch day wise
  todos, // Need to fetch day wise
*/

  return (
    <>
      <SimpleTimerContainer
        // totalSeconds={total!}
        userId={session.user.id}
        isRunning={isRunning || false}
        startTimeStamp={startTime!}
        focusAreas={focusAreas!}
        // timeSpentOfFA={timeSpentOfFA!}
        todos={todos!}
        groups={groups}
        pomodoroSettings={pomodoroSettings!}
      />
    </>
  );
};

export default SimpleTimer;
