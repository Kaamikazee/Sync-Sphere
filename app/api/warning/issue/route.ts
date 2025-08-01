import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session?.user) {
    return new Response("Unauthorized", {
      status: 400,
      statusText: "Unauthorized User",
    });
  }

//   const body: unknown = await request.json();
//   const result = todoSchema.safeParse(body);


//   if (!result.success) {
//     return NextResponse.json("ERRORS.WRONG_DATA", {
//       status: 401,
//     });
//   }

//   const {
//     title,
//     content,
//     completed, // default value
//   } = result.data;

const { targetUserId, message, groupId} = await request.json();

  try {
     await db.warning.create({
      data: {
        message,
        groupId,
        issuedById: session.user.id,
        userId: targetUserId,
      },
    });

    await db.notification.create({
        data: {
            userId: targetUserId,
            type: "WARNING",
            message: `You've been issued a warning by ${session.user.name || "an anonymous user"}!`,
        },
    })

    return NextResponse.json("OK", { status: 200 });
  } catch (error) {
    console.error("DB ERROR:", error); // <-- ADD THIS
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
}
