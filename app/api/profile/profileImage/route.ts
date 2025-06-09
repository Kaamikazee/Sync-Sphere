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

  const result = z
    .object({
      profileImage: z.string(),
    })
    .safeParse(body);

  if (!result.success) {
    return NextResponse.json("This type is not supported, { status: 401 }");
  }
  const { profileImage } = result.data;

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

    const updatedUser = await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        image: profileImage,
      },
    });

    return NextResponse.json(updatedUser, {
      statusText: "Profile image updated successfully",
      status: 200,
    });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", {
      status: 500,
      statusText: "Internal server error",
    });
  }
}
