import { SimpleTimerContainer } from "@/components/simpleTimer/SimpleTimer";
import { getGroups, getTotalSecondsOfUser } from "@/lib/api";
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
    const now = Date.now()
    
    
    return (
        <div>
            <SimpleTimerContainer totalSeconds={total} userId={session.user.id} groupIds={groupIds} isRunning={isRunning || false} startTimeStamp={startTime} />
        </div>
    )
} 

export default SimpleTimer;