import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (
  request: NextRequest,
  { params }: { params: { group_id: string } }
) => {
  const { group_id } = params;
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) return NextResponse.json("No such user found", { status: 404 });

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

    if (!group) return NextResponse.json("Group not found", { status: 200 });

    return NextResponse.json(group, { status: 200 });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};
