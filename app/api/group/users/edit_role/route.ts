import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { editUserRoleSchema } from "@/schemas/editUserRoleSchema";
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
  const result = editUserRoleSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json("The data you provided is wrong. Please provide the correct one", { status: 401 });
  }

  const {groupId, userId, userRole} = result.data;

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
        user.subscriptions[0].userRole === "READ_ONLY"
      ) {
        return NextResponse.json(
          "You don't have permission to do this action",
          {
            status: 403,
            statusText: "Forbidden",
          }
        );
      }

      const updatedUser = await db.subscription.update({
        where: {
            userId_groupId: {
                userId,
                groupId
            }
        },
        data: {
            userRole
        }
      })
    
      return NextResponse.json(updatedUser.userRole, {
        statusText: "User role updated successfully",
        status: 200,
      });
  } catch {
    return NextResponse.json("We are currently having problems. Please try again", {
        status: 500,
        statusText: "Internal server error",
      });
  }
}
