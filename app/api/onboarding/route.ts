import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { onboardingSchema } from "@/schemas/onboardingSchema";
import { getUserDayRange } from "@/utils/IsToday";
// import { normalizeToStartOfDayIST } from "@/utils/normalizeDate";
// import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getAuthSession();
      const user = session?.user;
    
  if (!user) {
    return new Response("User not authenticated", {
      status: 400,
      statusText: "Unauthorized User",
    });
  }

  const body: unknown = await req.json();

  const result = onboardingSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 401 });
  }

  const { name, surname, username } = result.data;

  try {
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
    });

    if (!user) {
      return new NextResponse("ERRORS.NO_USER_API", {
        status: 404,
        statusText: "User not found",
      });
    }

    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        completedOnboarding: true,
        username: username ?? "WHATEVER",
        name,
        surname,
      },
    });
    
    
      // Ensure timezone & resetHour exist (fallbacks if missing)
      const timezone = user.timezone ?? "Asia/Kolkata"; // default IST
      const resetHour = user.resetHour ?? 0;
    
      // Get user's day range in UTC
      const { startUtc } = getUserDayRange(
        { timezone, resetHour },
        new Date()
      );
    
      // `today` should match your dailyTotal.date (start of user’s day in UTC)
      const today = startUtc;

    const dailyTotal = await db.dailyTotal.findFirst({
      where: {
        userId: user.id,
        date: today,
      },
    });

    if (!dailyTotal) {
      await db.dailyTotal.create({
        data: {
          userId: user.id,
          date: today,
          totalSeconds: 0,
        },
      });
    }

    await db.pomodoroSettings.create({
      data: {
        userId: user.id,
      },
    });

    const focusAreas = ["Study", "Workout", "Meditation"];

    await Promise.all(
      focusAreas.map((name) =>
        db.focusArea.create({
          data: {
            name,
            userId: session.user.id,
          },
        })
      )
    );

    return NextResponse.json("OK", {
      status: 200,
    });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", {
      status: 406,
      statusText: "Internal server error",
    });
  }
}
