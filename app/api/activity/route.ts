import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { timerSchema } from "@/schemas/timerSchema";
import { NextResponse } from "next/server";


export const GET = async (request: Request) => {
  const session = await getAuthSession()
  const activityId = session?.user.id
  const url = new URL(request.url);

  const userId = url.searchParams.get("activityId");

  if (!userId || !activityId) return NextResponse.json("ERRORS.NO_USER_API", { status: 404 });

  try {
    const activity = await db.activity.findFirst({
      where: {
        userId: userId,
        id: activityId,
      },
    });

    if (!activity) {
      return NextResponse.json("not found", { status: 200 });
    }

    return NextResponse.json(activity.timeSpent, { status: 200 });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};


export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session?.user) {
    return new Response("Unauthorized", {
      status: 400,
      statusText: "Unauthorized User",
    });
  }

  const body: unknown = await request.json();
  const result = timerSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", {
      status: 401,
    });
  }

  const {
    activityName,
    timeSpent = 0 // default value
  } = result.data;

  try {
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
      include: {
        activities: {
          select: {
            userId: true,
            name: true,
            id: true,
            timeSpent: true,
          },
        },
      },
    });

    if (!user) {
      return new NextResponse("User not found", {
        status: 404,
        statusText: "User not Found",
      });
    }

    const activity = user.activities.find(
      (activity) => activity.name === activityName
    );

    if (!activity) {
      await db.activity.create({
        data: {
          userId: user.id,
          name: activityName,
          timeSpent: 0,
        },
      });
    } else {
      await db.activity.update({
        where: {
          id: activity.id,
        },
        data: {
          userId: user.id,
          name: activityName,
          timeSpent,
        },
      });
    }

    return NextResponse.json("OK", { status: 200 });
  } catch (error) {
  console.error("DB ERROR:", error); // <-- ADD THIS
  return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
}

}
