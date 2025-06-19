import { SimpleTimerContainer } from "@/components/simpleTimer/SimpleTimer";
import { getFocusAreas, getFocusAreaTotals, getGroupIdAndSubscribers, getGroups, getSubscribersOffAllGroups, getTodos, getTotalSecondsOfUser } from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

const SimpleTimer = async () => {
    const session = await checkIfUserCompleteOnboarding("/dashboard/simpleTimer");
    if (!session) return null;

    const totalSecondsOfUser = await getTotalSecondsOfUser(session.user.id)
    console.log("Which is getting returned:", totalSecondsOfUser);
    const total = totalSecondsOfUser?.totalSeconds
    const groups = await getGroups(session.user.id)
    const groupIds = groups.map(g => g.id)
    const startTime = totalSecondsOfUser?.startTimestamp
    const isRunning = totalSecondsOfUser?.isRunning
    
    const focusAreas = await getFocusAreas(session.user.id)
    const timeSpentOfFA = await getFocusAreaTotals(session.user.id)

    const todos = await getTodos(session.user.id)

    const subscribers = await getGroupIdAndSubscribers(session.user.id)

    
        console.log("SUBSCRIBERrsSSSS: ",subscribers);

    
    return (
        <SimpleTimerContainer
          totalSeconds={total!}
          userId={session.user.id}
          isRunning={isRunning || false}
          startTimeStamp={startTime!}
          focusAreas={focusAreas!}
          timeSpentOfFA={timeSpentOfFA!}
          todos= {todos!}
          IdsAndSubscriber={subscribers!}
          groups={groups}
        />
);

} 

export default SimpleTimer;