import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { updateTodoSchema } from "@/schemas/updateTodoSchema";
import { normalizeToStartOfDay } from "@/utils/normalizeDate";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getAuthSession();
  const url = new URL(request.url);
  const todoId = url.searchParams.get("todoId");

  if (!session?.user || !todoId) {
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

  const finalDate = date ? normalizeToStartOfDay(new Date(date)) : undefined;

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
