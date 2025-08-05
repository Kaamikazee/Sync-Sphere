import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { todoSchema } from "@/schemas/todoSchema";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getAuthSession();
  const url = new URL(request.url);
  const focusAreaId = url.searchParams.get("focusAreaId");

  const today = normalizeToStartOfDay(new Date());
    //   today.setHours(0, 0, 0, 0); // normalize to midnight

  if (!session?.user || !focusAreaId) {
    return new Response("Unauthorized", {
      status: 400,
      statusText: "Unauthorized User",
    });
  }

  const body: unknown = await request.json();
  const result = todoSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", {
      status: 401,
    });
  }

  const {
    title,
    content,
    completed, // default value
  } = result.data;

  try {
     await db.todo.create({
      data: {
        content,
        title,
        completed,
        focusAreaId,
        userId: session.user.id,
        date: today, // Use the normalized date
      },
    });

    return NextResponse.json("OK", { status: 200 });
  } catch (error) {
    console.error("DB ERROR:", error); // <-- ADD THIS
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
}
