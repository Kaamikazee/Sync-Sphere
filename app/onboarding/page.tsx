export const dynamic = "force-dynamic";

import { FirstStep } from "@/components/onboarding/FirstStep";
import { OnboardingFormProvider } from "@/context/OnboardingForm";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

const OnboardingPage = async () => {
  const session = await checkIfUserCompleteOnboarding("/onboarding");

  return (
    <div>
      <OnboardingFormProvider session={session}>
        <FirstStep profileImage={session.user.image} />
      </OnboardingFormProvider>
    </div>
  );
};

export default OnboardingPage;
