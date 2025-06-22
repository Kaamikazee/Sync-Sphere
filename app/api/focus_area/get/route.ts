import db from "@/lib/db";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  // const session = await getAuthSession()
   const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  // const userId = session?.user.id
  
  if (!userId) return NextResponse.json("No such user found", { status: 404 });

  try {
    const focusAreas = await db.focusArea.findMany({
      where: {
        userId: userId,
      }
    });

    

    if (!focusAreas) return NextResponse.json([], { status: 200 });

    return NextResponse.json(focusAreas, { status: 200 });
  } catch (err){
    return NextResponse.json(err, { status: 405 });
  }
};
