import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session?.user) {
    return new Response("User not authenticated", {
      status: 400,
      statusText: "Unauthorized User",
    });
  }

  const body: unknown = await request.json();
  const result = z
    .object({
      id: z.string(),
    })
    .safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 401 });
  }

  const { id } = result.data;

  try {
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
      include: {
        subscriptions: {
          where: {
            groupId: id,
          },
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
      return NextResponse.json(
        "You don't have permission to edit this workspace",
        {
          status: 403,
          statusText: "Forbidden",
        }
      );
    }

    const group = await db.group.update({
      where: {
        id,
      },
      data: {
        inviteCode: uuidv4(),
        adminCode: uuidv4(),
        canEditCode: uuidv4(),
        readOnlyCode: uuidv4(),
      },
    });

    return NextResponse.json(group, {
      statusText: "Link regenerated successfully",
      status: 200,
    });
  } catch {
    return NextResponse.json(
      "We are currently having problems. Please try again",
      {
        status: 500,
        statusText: "Internal Server Error",
      }
    );
  }
}
