/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { apiUpdateGroupSchema } from "@/schemas/updateGroupSchema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getAuthSession();
  const actorId = session?.user.id;

  if (!session?.user) {
    return new Response("User not authenticated", {
      status: 400,
      statusText: "Unauthorized User",
    });
  }

  const body: unknown = await req.json();
  const { data, groupId } = body as any;
  const input = { ...data, groupId };

  // validate flattened object
  const result = apiUpdateGroupSchema.safeParse(input);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 401 });
  }

  // parsed values from Zod (keep as any for flexibility)
  const parsed = result.data as any;

  try {
    const subscription = await db.subscription.findUnique({
      where: {
        userId_groupId: {
          userId: actorId!,
          groupId,
        },
      },
      select: {
        userRole: true,
      },
    });

    if (!subscription) {
      return new NextResponse("Not a member of this group", {
        status: 404,
        statusText: "Forbidden",
      });
    }

    if (
      !(subscription.userRole === "OWNER" || subscription.userRole === "ADMIN")
    ) {
      return new NextResponse("You don't have permission to do this action", {
        status: 403,
        statusText: "Forbidden",
      });
    }

    // Build update object only with keys the client actually sent
    const updateData: any = {};

    if (Object.prototype.hasOwnProperty.call(parsed, "groupName")) {
      updateData.name = parsed.groupName;
    }
    if (Object.prototype.hasOwnProperty.call(parsed, "description")) {
      updateData.description = parsed.description;
    }
    if (Object.prototype.hasOwnProperty.call(parsed, "isPrivate")) {
      updateData.isPrivate = parsed.isPrivate;
    }
    if (Object.prototype.hasOwnProperty.call(parsed, "password")) {
      updateData.password = parsed.password;
    }
    // Important: only update image when `file` key was present in the request,
    // even if its value is null (which means "delete the image").
    if (Object.prototype.hasOwnProperty.call(parsed, "file")) {
      // parsed.file can be: string (new URL) | null (explicit delete)
      updateData.image = parsed.file;
    }

    // If you want to require at least one field to change, you can check:
    // if (Object.keys(updateData).length === 0) { return NextResponse.json("No changes provided", { status: 400 }); }

    const group = await db.group.update({
      where: {
        id: groupId,
      },
      data: updateData,
    });

    return NextResponse.json(group, {
      statusText: "Group updated successfully",
      status: 200,
    });
  } catch (err) {
    console.error("Update group error:", err);
    return NextResponse.json("ERRORS.DB_ERROR", {
      status: 500,
      statusText: "Internal server error",
    });
  }
}
