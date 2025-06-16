import db from "@/lib/db";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const groupId = url.searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json("ERRORS.NO_USER_API", { status: 400 });
  }

  const today = normalizeToStartOfDay(new Date());
//   today.setHours(0, 0, 0, 0); // normalize to midnight

  try {
    const membersWithSeconds = await db.subscription.findMany({
      where: {
        groupId
      },
      select: {
        user: {
            select: {
                id: true,
                name: true,
                image: true,
                 dailyTotal : {
                    where: {
                        date: today
                    },
                    select: {
                        totalSeconds: true
                    }
                 }
            }
        }
      }
    });

    // If no record exists, create one 
    if (!membersWithSeconds) {
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(membersWithSeconds, { status: 200 });

  } catch (err) {
    console.error("GET dailyTotal error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
