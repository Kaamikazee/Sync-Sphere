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
  <div className="min-h-screen p-4 bg-gradient-to-br from-sky-800/40 via-purple-800/30 to-indigo-800/40 backdrop-blur-sm">
    <div className="max-w-xl mx-auto">
      <div className="bg-gradient-to-r from-cyan-500/40 via-sky-500/30 to-indigo-600/40 p-6 rounded-2xl shadow-xl border border-white/20 backdrop-blur-md hover:shadow-2xl transition-all duration-300">
        <SimpleTimerContainer
          totalSeconds={total}
          userId={session.user.id}
          groupIds={groupIds}
          isRunning={isRunning || false}
          startTimeStamp={startTime}
        />
      </div>
    </div>
  </div>
);

} 

export default SimpleTimer;