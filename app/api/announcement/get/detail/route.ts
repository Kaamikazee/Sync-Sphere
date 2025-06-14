import db from "@/lib/db";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const announcementId = url.searchParams.get("announcementId");

  console.log("Back ID:", announcementId)

  if (!announcementId)
    return NextResponse.json("No such user found", { status: 404 });

  try {
    const announcementDetail = await db.announcement.findUnique({
      where: {
        id: announcementId,
      },
    });

    console.log("BAck Det:",announcementDetail);
    

    if (!announcementDetail)
      return NextResponse.json({ Message: "Not FOund" }, { status: 400 });

    return NextResponse.json(announcementDetail, { status: 200 });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};
