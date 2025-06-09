import { redirect } from "next/navigation";
import { getAuthSession } from "./auth";

export const checkIfUserCompleteOnboarding = async (currentPath: string) => {
  try {
    const session = await getAuthSession();

    if (!session) redirect("/sign-in");
    if (session.user.completedOnboarding && currentPath === "/onboarding")
      redirect("/dashboard");
    
    return session;
  } catch (error) {
    console.error("Error checking onboarding status:", error);
  }
};
