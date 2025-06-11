// app/dashboard/timer/page.tsx
// import TimerClientWrapper from "@/components/dashboard/timer/TimerClientWrapper";
import TimerClientWrapper from "@/components/dashboard/timer/TimerClientWrapper";
import { getActivities } from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

export default async function DashboardPage() {
  const session = await checkIfUserCompleteOnboarding("/dashboard/timer");
  if (!session) return null;

  const activities = (await getActivities(session.user.id)) || [];

  return <TimerClientWrapper activities={activities} />;
}
