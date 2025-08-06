/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { apiUpdateGroupSchema } from "@/schemas/updateGroupSchema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getAuthSession();

  if (!session?.user) {
    return new Response("User not authenticated", {
      status: 400,
      statusText: "Unauthorized User",
    });
  }

  const body: unknown = await req.json();


  const { data, groupId } = body as any;
  const input = { ...data, groupId };

  // ✅ Validate the flattened object
  const result = apiUpdateGroupSchema.safeParse(input);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 401 });
  }

  const { groupName, file, description, isPrivate, password } = result.data;

  try {
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
        subscriptions: {
          some: {
            groupId,
          },
        },
      },
      include: {
        subscriptions: {
          select: {
            userRole: true,
          },
        },
      },
    });

    if (!user) {
      return new NextResponse("User not found", {
        status: 404,
        statusText: "User not found",
      });
    }

    if (
      user.subscriptions[0].userRole === "CAN_EDIT" ||
      user.subscriptions[0].userRole === "READ_ONLY"
    ) {
      return NextResponse.json("You don't have permission to do this action", {
        status: 403,
        statusText: "Forbidden",
      });
    }
    const group = await db.group.update({
      where: {
        id: groupId,
      },
      data: {
        name: groupName,
        image: file ? file : null,
        description,
        isPrivate,
        password,
      },
    });

    return NextResponse.json(group, {
      statusText: "Group updated successfully",
      status: 200,
    });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", {
      status: 500,
      statusText: "Internal server error",
    });
  }
}
