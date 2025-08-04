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
    password: z.string().optional(),
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
                }
            }
        }
    })

    if (user?.subscriptions[0]) {
        return new NextResponse("You are already a member of this group", {
          status: 404,
          statusText: "Already a member",
        });
      }

      await db.subscription.create({
        data: {
            groupId,
            userId: session.user.id,
        }
      })
    
      return NextResponse.json("OK", {
        statusText: "You have been added to the group successfully",
        status: 200,
      });
  } catch {
    return NextResponse.json("We are currently having problems. Please try again", {
        status: 500,
        statusText: "Internal server error",
      });
  }
}
