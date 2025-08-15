import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

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
  const result = z.object({
    groupId: z.string(),
  }).safeParse(body);

  if (!result.success) {
    return NextResponse.json("The data you provided is wrong. Please provide the correct one", { status: 401 });
  }

  const {groupId} = result.data;

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
      !(subscription.userRole === "OWNER")
    ) {
      return new NextResponse("Only owner of the group is allowed to delete the group", {
        status: 403,
        statusText: "Forbidden",
      });
    }
      
      await db.group.delete({
        where: {
            id: groupId
        }
      })
    
      return NextResponse.json("OK", {
        statusText: "User removed from the group successfully",
        status: 200,
      });
  } catch (error) {
    console.log(error);
    return NextResponse.json("We are currently having problems. Please try again", {
        status: 500,
        statusText: "Internal server error",
      });
  }
}
