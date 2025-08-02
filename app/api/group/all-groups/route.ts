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
            creator: {
                select: {
                    name: true,
                }
            }
        }, 
    });

    console.log("Groupss form s,;:", groups);
    

    // Attach user name and subscribers count to each group object
    const allGroups = groups.map((group) => ({
      ...group,
      userName: group.creator?.name || null,
      subscribersCount: Array.isArray(group.subscribers) ? group.subscribers.length : 0,
    }));
    console.log("allGroups:", allGroups);

    if (!allGroups) return NextResponse.json([], { status: 200 });

    // Remove the full subscribers array from the response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const responseGroups = allGroups.map(({ subscribers, ...rest }) => rest);

    return NextResponse.json(responseGroups, { status: 200 });
  } catch {
    console.log("DB ERROR");
    
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};
