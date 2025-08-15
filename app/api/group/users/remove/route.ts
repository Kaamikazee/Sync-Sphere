import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { removeUserSchema } from "@/schemas/removeUserSchema";
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
  const result = removeUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json("The data you provided is wrong. Please provide the correct one", { status: 401 });
  }

  const {groupId, userId} = result.data;

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

      await db.subscription.delete({
        where: {
            userId_groupId: {
                userId,
                groupId
            }
        }
      })
    
      return NextResponse.json("OK", {
        statusText: "User removed from the group successfully",
        status: 200,
      });
  } catch {
    return NextResponse.json("We are currently having problems. Please try again", {
        status: 500,
        statusText: "Internal server error",
      });
  }
}
