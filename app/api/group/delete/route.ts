import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(req: Request) {
  const session = await getAuthSession();
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
    const user = await db.user.findUnique({
        where: {
            id: session.user.id
        },
        include: {
            subscriptions: {
                where: {
                    groupId
                },
                select: {
                    userRole: true
                }
            }
        }
    })

    if (!user) {
        return new NextResponse("User not found", {
          status: 404,
          statusText: "User not found",
        });
      }

      if (
        user.subscriptions[0].userRole === "CAN_EDIT" ||
        user.subscriptions[0].userRole === "READ_ONLY" || 
        user.subscriptions[0].userRole === "ADMIN"
      ) {
        return NextResponse.json(
          "You don't have permission to do this action",
          {
            status: 403,
            statusText: "Forbidden",
          }
        );
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
