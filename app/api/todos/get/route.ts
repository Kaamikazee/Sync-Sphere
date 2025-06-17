import db from "@/lib/db";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
//   const activityId = session?.user.id
  const url = new URL(request.url);

  const userId = url.searchParams.get("userId");
  console.log("USERIDddd:", userId, typeof userId);

  if (!userId) return NextResponse.json("ERRORS.NO_USER_API", { status: 404 });

  try {
    const todos = await db.todo.findMany({
      where: {
        userId: "cmbp8m1kr0000ystkcxarajut",
      },
    });

    console.log("TODOSSSS:", todos);
    


    if (!todos) {
      console.log("NOOOTODOSSSS:", todos);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(todos, { status: 200 });
  } catch {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};