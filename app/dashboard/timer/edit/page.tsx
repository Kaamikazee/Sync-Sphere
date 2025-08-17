export const dynamic = "force-dynamic";


import { Edit } from "@/components/simpleTimer/edit/Edit";
import { getFocusAreas } from "@/lib/api";
// import { getAllSegments, getTotalSecondsOfUser } from "@/lib/api";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

const TimerEdit = async () => {
    const session = await checkIfUserCompleteOnboarding("/dashboard/timer/edit");
    if (!session) return null;
    const focusAreas = await getFocusAreas(session.user.id);
    const focusAreaNamesAndIds = focusAreas!.map((item) => ({
      name: item.name,
      id: item.id
    })).filter(Boolean);


    return (
        <div>
          <Edit userId={session.user.id} focusAreaNamesAndIds={focusAreaNamesAndIds} />
        </div>
);

} 

export default TimerEdit;