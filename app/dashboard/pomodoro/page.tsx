import PomodoroContainer from "@/components/dashboard/pomodoro/PomodoroContainer";
import { getUserPomodoroSettings } from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

const Pomodoro = async () => {
    const session = await checkIfUserCompleteOnboarding("/dashboard/pomodoro")

    if (!session) return null
    const pomodoroSettings = await getUserPomodoroSettings(session?.user.id)

    return (
        <>
        <main className="flex flex-col gap-2 h-full items-center">
            <PomodoroContainer pomodoroSettings={pomodoroSettings} />
        </main>
        </>
    )

}

export default Pomodoro;