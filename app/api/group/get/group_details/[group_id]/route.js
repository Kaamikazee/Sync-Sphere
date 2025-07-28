    /* eslint-disable */
    // @ts-nocheck
// @ts-expect-error: Next.js type inference fails here for route params
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(
  request,
  context // 👈 change here
) {
  const { group_id } = context.params;
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId)
    return NextResponse.json("No such user found", { status: 404 });

  try {
    const group = await db.group.findUnique({
      where: {
        id: group_id,
        subscribers: {
          some: {
            userId,
          },
        },
      },
    });

    if (!group)
      return NextResponse.json("Group not found", { status: 200 });

    return NextResponse.json(group, { status: 200 });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
}
