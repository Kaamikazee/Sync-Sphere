export const dynamic = "force-dynamic";
import { FirstStep } from "@/components/onboarding/FirstStep";
import { OnboardingFormProvider } from "@/context/OnboardingForm";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

const onboarding = async () => {
    const session = await checkIfUserCompleteOnboarding("/onboarding")

    return (
        <div className="">
            <OnboardingFormProvider session={session!}>
            <FirstStep profileImage={session?.user.image}/>
            </OnboardingFormProvider>
        </div>
    )
}

export default onboarding;