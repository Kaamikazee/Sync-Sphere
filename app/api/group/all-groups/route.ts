import db from "@/lib/db";
import { NextResponse } from "next/server";

export const GET = async () => {


  try {
    const groups = await db.group.findMany({
        select: {
            id: true,
            name: true,
            createdAt: true,
            image: true,
            color: true,
            readOnlyCode: true,
            subscribers: true,
            description: true,
            isPrivate: true,
            password: true,
            creator: {
                select: {
                    name: true,
                }
            }
        }, 
    });

    

    // Attach user name and subscribers count to each group object
    const allGroups = groups.map((group) => ({
      ...group,
      userName: group.creator?.name || null,
      subscribersCount: Array.isArray(group.subscribers) ? group.subscribers.length : 0,
    }));

    if (!allGroups) return NextResponse.json([], { status: 200 });

    // Remove the full subscribers array from the response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars
    const responseGroups = allGroups.map(({ subscribers, ...rest }) => rest);

    return NextResponse.json(responseGroups, { status: 200 });
  } catch {
    
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};
