// lib/CheckCompOnb.ts
import { getAuthSession } from "./auth";
import { redirect } from "next/navigation";
import db from "./db";

export const checkIfUserCompleteOnboarding = async (currentPath: string) => {
  const session = await getAuthSession();

  if (!session) {
    redirect("/sign-in"); // 🔁 hard redirect
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { completedOnboarding: true },
  });

  if (dbUser?.completedOnboarding && currentPath === "/onboarding") {
    redirect("/dashboard"); // 🔁 hard redirect
  }

  return session; // ✅ Return session directly as before
};
