import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await getAuthSession();

  if (!session?.user) {
    return new Response("User not authenticated", {
      status: 400,
      statusText: "Unauthorized User",
    });
  }

  try {
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
    });

    if (!user) {
      return new NextResponse("User not found,", {
        status: 404,
        statusText: "User not found",
      });
    }
    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        image: null,
      },
    });

    return NextResponse.json("OK", {
      statusText: "Profile image deleted successfully",
      status: 200,
    });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", {
      status: 500,
      statusText: "Internal server error",
    });
  }
}
