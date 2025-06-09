import { SettingsContainer } from "@/components/dashboard/pomodoro/SettingsContainer";
import { getUserPomodoroSettings } from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

const PomodoroSettings = async () => {
  const session = await checkIfUserCompleteOnboarding(`/dashboard/pomodoro`);
  if (!session) return null;

  const pomodoroSettings = await getUserPomodoroSettings(session?.user.id);

  return (
    <>
        <main className="flex flex-col gap-2 h-full">
            <SettingsContainer pomodoroSettings={pomodoroSettings} />
        </main>
    </>
  )
};

export default PomodoroSettings;