import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { removeUserSchema } from "@/schemas/removeUserSchema";
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
  const result = removeUserSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json("The data you provided is wrong. Please provide the correct one", { status: 401 });
  }

  const {groupId, userId} = result.data;

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
        user.subscriptions[0].userRole === "OWNER"
      ) {
        return NextResponse.json(
          "You don't have permission to do this action",
          {
            status: 403,
            statusText: "Forbidden",
          }
        );
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
