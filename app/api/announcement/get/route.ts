import db from "@/lib/db";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const groupId = url.searchParams.get("groupId");

  if (!groupId) return NextResponse.json("No such user found", { status: 404 });

  try {
    const announcements = await db.announcement.findMany({
      where: {
        groupId,
      }
    });

    if (!announcements) return NextResponse.json([], { status: 200 });

    return NextResponse.json(announcements, { status: 200 });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};
