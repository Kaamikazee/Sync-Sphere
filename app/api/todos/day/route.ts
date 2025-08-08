import db from "@/lib/db";
import { normalizeToStartOfDayIST } from "@/utils/normalizeDate";
// import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
//   const activityId = session?.user.id
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const userId = url.searchParams.get("userId");

  if (!userId) return NextResponse.json("ERRORS.NO_USER_API", { status: 404 });

  const today = normalizeToStartOfDayIST(new Date());
    const finalDate = date ? normalizeToStartOfDayIST(new Date(date)) : today;

  try {
    const todos = await db.todo.findMany({
      where: {
        userId: userId,
        date: finalDate, // Filter by the normalized date
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!todos) {
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(todos, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};