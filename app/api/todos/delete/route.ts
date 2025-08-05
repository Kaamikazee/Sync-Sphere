import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  const session = await getAuthSession();
  const url = new URL(request.url);
  const todoId = url.searchParams.get("todoId");

  if (!session?.user || !todoId) {
    return new Response("Unauthorized", {
      status: 400,
      statusText: "Unauthorized User",
    });
  }



  try {
    await db.todo.delete({
      where: {
        id: todoId,
      }
    });

    return NextResponse.json("OK", { status: 200 });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
}
