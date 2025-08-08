import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { todoSchema } from "@/schemas/todoSchema";
import { getUserDayRange } from "@/utils/IsToday";
// import { normalizeToStartOfDayIST } from "@/utils/normalizeDate";
// import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getAuthSession();
  const url = new URL(request.url);
  const focusAreaId = url.searchParams.get("focusAreaId");
    const user = session?.user;  

    if (!user) {
      return NextResponse.json("ERRORS.NO_USER_ID", { status: 400 });
    }
  
    // Ensure timezone & resetHour exist (fallbacks if missing)
    const timezone = user.timezone ?? "Asia/Kolkata"; // default IST
    const resetHour = user.resetHour ?? 0;
  
    // Get user's day range in UTC
    const { startUtc } = getUserDayRange(
      { timezone, resetHour },
      new Date()
    );
  
    // `today` should match your dailyTotal.date (start of user’s day in UTC)
    const today = startUtc;

  if (!user || !focusAreaId) {
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
