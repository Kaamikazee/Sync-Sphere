import db from "@/lib/db";
import { normalizeToStartOfDayIST } from "@/utils/normalizeDate";
// import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const groupId = url.searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json("ERRORS.NO_USER_API", { status: 400 });
  }

  const today = normalizeToStartOfDayIST(new Date());
  //   today.setHours(0, 0, 0, 0); // normalize to midnight

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
