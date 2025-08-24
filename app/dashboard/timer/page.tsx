export const dynamic = "force-dynamic";
import { SimpleTimerContainer } from "@/components/simpleTimer/SimpleTimer";
import {
  getFocusAreas,
  getGroups,
  getUserPomodoroSettings,
} from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";
import { getDailyTotalForUser } from "@/utils/dailyTotal";

const SimpleTimer = async () => {
  const session = await checkIfUserCompleteOnboarding("/dashboard/timer");
  if (!session) return null;

  const totalSecondsOfUser = await getDailyTotalForUser(
    session.user.id,
    session.user.timezone!,
    session.user.resetHour!
  );
  const groups = await getGroups(session.user.id);
  const startTime = totalSecondsOfUser?.startTimestamp;
  const isRunning = totalSecondsOfUser?.isRunning;

  const focusAreas = await getFocusAreas(session.user.id);
  const pomodoroSettings = await getUserPomodoroSettings(session?.user.id);


  return (
    <div className="overflow-x-hidden">
      <SimpleTimerContainer
        userId={session.user.id}
        userName={session.user.name!}
        isRunning={isRunning || false}
        startTimeStamp={startTime!}
        focusAreas={focusAreas!}
        groups={groups}
        pomodoroSettings={pomodoroSettings!}
      />
    </div>
  );
};

export default SimpleTimer;
