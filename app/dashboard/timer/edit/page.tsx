import { Edit } from "@/components/simpleTimer/edit/Edit";
import { getAllSegments, getTotalSecondsOfUser } from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

const TimerEdit = async () => {
    const session = await checkIfUserCompleteOnboarding("/dashboard/timer/edit");
    if (!session) return null;

    const totalSecondsOfUser = await getTotalSecondsOfUser(session.user.id)
        const total = totalSecondsOfUser?.totalSeconds
    const segments = await getAllSegments(session.user.id)
    
    
    return (
        <div>
          <Edit totalSeconds={total!} segments={segments!} />
        </div>
);

} 

export default TimerEdit;