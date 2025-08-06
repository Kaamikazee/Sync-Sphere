import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { onboardingSchema } from "@/schemas/onboardingSchema";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getAuthSession();

  if (!session?.user) {
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

    const today = normalizeToStartOfDay(new Date());

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
