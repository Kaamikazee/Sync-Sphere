import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session?.user) {
    return new Response("Unauthorized", {
      status: 400,
      statusText: "Unauthorized User",
    });
  }

  const body: unknown = await request.json();
  const result = z.object({
    focusAreaName: z.string()
  }).safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", {
      status: 401,
    });
  }

  const {
    focusAreaName,
  } = result.data;

  try {
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
      include: {
        focusAreas: {
          select: {
            userId: true,
            name: true,
            id: true,
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

    const focusArea = user.focusAreas.find(
      (focusArea) => focusArea.name === focusAreaName
    );

    if (!focusArea) {
      await db.focusArea.create({
        data: {
          userId: user.id,
          name: focusAreaName,
        },
      });
    } else {
      await db.focusArea.update({
        where: {
          id: focusArea.id,
        },
        data: {
          userId: user.id,
          name: focusAreaName,
        },
      });
    }

    return NextResponse.json("OK", { status: 200 });
  } catch (error) {
  console.error("DB ERROR:", error); // <-- ADD THIS
  return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
}

}