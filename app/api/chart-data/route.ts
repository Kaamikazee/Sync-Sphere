import db from "@/lib/db";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json("ERRORS.NO_USER_API", { status: 400 });
  }


  try {
    const summary = await db.timerSegment.findMany({
        where: {
            userId: userId
        },
        orderBy: {
            start: "asc"
        }
    })


    return NextResponse.json(summary, { status: 200 });

  } catch (err) {
    console.error("GET dailyTotal error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
};
