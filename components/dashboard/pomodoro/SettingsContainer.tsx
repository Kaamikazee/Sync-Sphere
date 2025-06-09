import { PomodoroSettings } from "@prisma/client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsForm } from "./SettingsForm";

interface Props {
  pomodoroSettings: PomodoroSettings;
}

export const SettingsContainer = ({ pomodoroSettings }: Props) => {
  return (
    <Card className="bg-background border-none shadow-none">
      <CardHeader>
        <CardTitle className="tracking-tight text-2xl">Pomodoro Settings</CardTitle>
        <CardDescription className="text-base">Manage your settings. Personalize your Pomodoro as you wish. You can change the number of rounds, work and break durations, as well as customize notification sounds. </CardDescription>
      </CardHeader>
      <CardContent>
        <SettingsForm pomodoroSettings={pomodoroSettings} />
      </CardContent>
    </Card>
  );
};
