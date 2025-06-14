import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { announcementSchema } from "@/schemas/announcementSchema";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getAuthSession();
  const url = new URL(request.url);
  const groupId = url.searchParams.get("groupId");
  
  

  if (!session?.user || !groupId) {
    return new Response("Unauthorized", {
      status: 400,
      statusText: "Unauthorized User",
    });
  }

  const body: unknown = await request.json();
  const result = announcementSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", {
      status: 401,
    });
  }

  const { title, content } = result.data;

  try {
    await db.announcement.create({
      data: {
        content,
        title,
        groupId,
        userId: session.user.id,
      },
    });

    return NextResponse.json("OK", { status: 200 });
  } catch (error) {
    console.error("DB ERROR:", error); // <-- ADD THIS
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
}
