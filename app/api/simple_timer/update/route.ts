import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";
import { z } from "zod";

export const POST = async (request: Request) => {
  const session = await getAuthSession();
  const userId = session?.user.id;

  if (!userId) {
    return NextResponse.json("ERRORS.NO_USER_ID", { status: 400 });
  }

  const body: unknown = await request.json();

  const result = z
    .object({
      totalSeconds: z.number(),
    })
    .safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 401 });
  }

  const { totalSeconds } = result.data;
  const today = normalizeToStartOfDay(new Date());

  if (!session?.user)
    return NextResponse.json("ERRORS.NO_USER_API", { status: 404 });

  try {
    await db.dailyTotal.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      update: {
        isRunning: false,
        totalSeconds // Update it from the segment
      },
      create: {
        userId,
        date: today,
        totalSeconds,
      },
    });

    return NextResponse.json("OK", { status: 200 });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};
