// app/api/todos/list/route.ts
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const todos = await db.todo.findMany({
      where: { userId: session.user.id },
      include: { focusArea: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    const serialized = todos.map((t) => ({
      ...t,
      date: t.date ? t.date.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      focusArea: t.focusArea ? { id: t.focusArea.id, name: t.focusArea.name } : null,
    }));

    return NextResponse.json(serialized);
  } catch (err) {
    console.error("Failed to fetch todos:", err);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }
}
