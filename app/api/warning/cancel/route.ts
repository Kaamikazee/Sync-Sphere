// app/api/warning/cancel/route.ts
import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { warningId } = body;
  if (!warningId) {
    return NextResponse.json({ error: "Missing warningId" }, { status: 400 });
  }

  try {
    // remove the warning (or mark it cancelled if you prefer a soft-delete field)
    const deleted = await db.warning.delete({
      where: { id: warningId },
    });

    return NextResponse.json({ ok: true, deleted }, { status: 200 });
  } catch (err) {
    console.error("DB ERROR (warning cancel):", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
