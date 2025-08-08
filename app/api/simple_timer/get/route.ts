import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { getUserDayRange } from "@/utils/IsToday";
// import { normalizeToStartOfDayIST } from "@/utils/normalizeDate";
// import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const groupId = url.searchParams.get("groupId");
  const session = await getAuthSession();
  const user = session?.user;

  if (!user) {
    return NextResponse.json("ERRORS.NO_USER_ID", { status: 400 });
  }

  if (!groupId) {
    return NextResponse.json("ERRORS.NO_USER_API", { status: 400 });
  }

  // Ensure timezone & resetHour exist (fallbacks if missing)
  const timezone = user.timezone ?? "Asia/Kolkata"; // default IST
  const resetHour = user.resetHour ?? 0;

  // Get user's day range in UTC
  const { startUtc } = getUserDayRange({ timezone, resetHour }, new Date());
  const today = startUtc;

  // `today` should match you

  try {
    const membersWithSeconds = await db.subscription.findMany({
      where: {
        groupId,
      },
      include: {
        user: {
          include: {
            receivedWarnings: true,
            issuedWarnings: true,
            dailyTotal: {
              where: { date: today },
              take: 1,
            },
          },
        },
      },
    });

    const membersWithTimer = membersWithSeconds.map((subs) => {
      const warnings = subs.user.receivedWarnings?.filter(
        (w) => w.groupId === groupId
      );

      return {
        user: {
          id: subs.userId,
          name: subs.user.name,
          image: subs.user.image,
          totalSeconds: subs.user.dailyTotal[0]?.totalSeconds ?? 0,
          isRunning: subs.user.dailyTotal[0]?.isRunning ?? false,
          startTimestamp: subs.user.dailyTotal[0]?.startTimestamp ?? null,
          warningMessage: warnings.length > 0 ? warnings[0].message : null, // assuming you show latest only
          warningId: warnings.length > 0 ? warnings[0].id : null,
          Role: subs.userRole,
        },
      };
    });

    // If no record exists, create one
    if (!membersWithSeconds) {
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(membersWithTimer, { status: 200 });
  } catch (err) {
    console.error("GET dailyTotal error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
