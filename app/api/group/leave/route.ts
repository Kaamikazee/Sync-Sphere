import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { removeUserSchema } from "@/schemas/removeUserSchema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json("User not authenticated", { status: 401 });
  }

  const body: unknown = await req.json();
  const result = removeUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json("Invalid request payload", { status: 400 });
  }

  const { groupId, userId: targetUserId } = result.data;
  const actorId = session.user.id;

  try {
    // fetch actor's subscription for this group
    const actorSubscription = await db.subscription.findUnique({
      where: {
        userId_groupId: {
          userId: actorId,
          groupId,
        },
      },
      select: { userRole: true },
    });

    if (!actorSubscription) {
      // not a member of the group
      return NextResponse.json("You are not a member of this group", { status: 403 });
    }

    // only OWNER or ADMIN can remove members
    if (!(actorSubscription.userRole === "OWNER" || actorSubscription.userRole === "ADMIN")) {
      return NextResponse.json("You don't have permission to do this action", { status: 403 });
    }

    // fetch target's subscription
    const targetSubscription = await db.subscription.findUnique({
      where: {
        userId_groupId: {
          userId: targetUserId,
          groupId,
        },
      },
      select: { userRole: true },
    });

    if (!targetSubscription) {
      return NextResponse.json("Target user is not a member of this group", { status: 404 });
    }

    // protect OWNER: only OWNER can remove owner
    if (targetSubscription.userRole === "OWNER" && actorSubscription.userRole !== "OWNER") {
      return NextResponse.json("Cannot remove the group owner", { status: 403 });
    }

    // optionally: prevent admins from removing themselves (if desired)
    if (actorId === targetUserId && actorSubscription.userRole === "ADMIN") {
      return NextResponse.json("Admins cannot remove themselves", { status: 400 });
    }

    // perform deletion
    await db.subscription.delete({
      where: {
        userId_groupId: {
          userId: targetUserId,
          groupId,
        },
      },
    });

    return NextResponse.json("OK", {
      status: 200,
      statusText: "User removed from the group successfully",
    });
  } catch (err) {
    console.error("removeUser error:", err);
    return NextResponse.json("Internal server error", { status: 500 });
  }
}
