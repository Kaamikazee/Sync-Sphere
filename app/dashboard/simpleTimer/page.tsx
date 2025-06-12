import { SimpleTimerContainer } from "@/components/simpleTimer/SimpleTimer";
import { getTotalSecondsOfUser } from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

const SimpleTimer = async () => {
    const session = await checkIfUserCompleteOnboarding("/dashboard/simpleTimer");
    if (!session) return null;

    const totalSecondsOfUser = await getTotalSecondsOfUser(session.user.id)
    console.log("Which is getting returned:", totalSecondsOfUser);
    const total = totalSecondsOfUser
    
    
    return (
        <div>
            <SimpleTimerContainer total={total!} />
        </div>
    )
} 

export default SimpleTimer;