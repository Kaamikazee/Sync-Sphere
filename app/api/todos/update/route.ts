import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { updateTodoSchema } from "@/schemas/updateTodoSchema";
import { getUserDayRange } from "@/utils/IsToday";
// import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getAuthSession();
  const url = new URL(request.url);
  const todoId = url.searchParams.get("todoId");
  const user = session?.user;

  if (!user || !todoId) {
    return new Response("Unauthorized", {
      status: 400,
      statusText: "Unauthorized User",
    });
  }

  const body: unknown = await request.json();
  const result = updateTodoSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", {
      status: 401,
    });
  }

  const {
    title,
    content,
    completed, // default value
    date, // Optional date field
  } = result.data;

   // Ensure timezone & resetHour exist (fallbacks if missing)
    const timezone = user.timezone ?? "Asia/Kolkata";
    const resetHour = user.resetHour ?? 0;
  
    // Pick the base date (user-specified or today)
    const baseDate = date ? new Date(date) : new Date();
  
    // Get that day's start & end in UTC according to user's timezone/resetHour
    const { startUtc } = getUserDayRange(
      { timezone, resetHour },
      baseDate
    );
  
    const finalDate = date
      ? getUserDayRange({ timezone, resetHour }, new Date(date)).startUtc
      : startUtc;

  try {
    await db.todo.update({
      where: {
        id: todoId,
      },
      data: {
        content,
        title,
        completed,
        date: finalDate
      },
    });

    return NextResponse.json("OK", { status: 200 });
  } catch (error) {
    console.error("DB ERROR:", error); // <-- ADD THIS
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
}
