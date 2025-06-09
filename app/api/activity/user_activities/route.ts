import db from "@/lib/db";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) return NextResponse.json("No such user found", { status: 404 });

  try {
    const activities = await db.activity.findMany({
      where: {
        userId: userId,
      }
    });

    if (!activities) return NextResponse.json([], { status: 200 });

    return NextResponse.json(activities, { status: 200 });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};
