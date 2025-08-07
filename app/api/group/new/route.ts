import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { getRandomGroupColor } from "@/lib/getRandomGroupColor";
import { apiGroupSchema } from "@/schemas/groupSchema";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  const session = await getAuthSession();

  if (!session?.user) {
    return new Response("User not authenticated", {
      status: 400,
      statusText: "Unauthorized User",
    });
  }

  const body: unknown = await req.json();

  const result = apiGroupSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 401 });
  }

  const { groupName, file, description, isPrivate, password } = result.data;

  try {
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
      include: {
        createdGroups: {
          select: {
            id: true,
            name: true,
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

    if (user.createdGroups.length >= 5) {
      return new NextResponse(
        "ERRORS.The limit on the number of workspaces that can be created has been reached",
        { status: 402 }
      );
    }

    const theSameWorkspaceName = user.createdGroups.find(
      (group) => group.name.toLowerCase() === groupName.toLowerCase()
    );

    if (theSameWorkspaceName) {
      return new NextResponse("Workspace already exists", { status: 403 });
    }

    const color = getRandomGroupColor();

    const group = await db.group.create({
      data: {
        creatorId: user.id,
        name: groupName,
        image: file ? file : null,
        color,
        inviteCode: uuidv4(),
        adminCode: uuidv4(),
        canEditCode: uuidv4(),
        readOnlyCode: uuidv4(),
        description,
        isPrivate,
        password,
      },
    });

    await db.subscription.create({
      data: {
        userId: user.id,
        groupId: group.id,
        userRole: "OWNER",
      },
    });

    await db.chat.create({
      data: {
        group: {
          connect: { id: group.id },
        },
      },
    });

    return NextResponse.json(group, {
      statusText: "Group created successfully",
      status: 200,
    });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", {
      status: 500,
      statusText: "Internal server error",
    });
  }
}
