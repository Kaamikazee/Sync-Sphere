import { getAuthSession } from "@/lib/auth";
import db from "@/lib/db";
import { onboardingSchema } from "@/schemas/onboardingSchema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  console.log("API endpoint hit");
  const session = await getAuthSession();
  console.log("Session:", session);

  if (!session?.user) {
    return new Response("User not authenticated", {
      status: 400,
      statusText: "Unauthorized User",
    });
  }

  const body: unknown = await req.json();
  console.log("Request body:", body);

  const result = onboardingSchema.safeParse(body);
  console.log("Validation result:", result);

  if (!result.success) {
    console.log(
      "Validation errors:",
      JSON.stringify(result.error.errors, null, 2)
    );
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 401 });
  }
  console.log("RESULT DATA: ", result.data);

  const { name, surname, username } = result.data;

  try {
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
    });
    console.log("User Found: ", user);

    if (!user) {
      console.log("User not Found");
      return new NextResponse("ERRORS.NO_USER_API", {
        status: 404,
        statusText: "User not found",
      });
    }

    console.log("User getting updated");
    await db.user.update({
        where: {
        id: user.id,
      },
      data: {
        completedOnboarding: true,
        username: username ?? "WHATEVER",
        name,
        surname,
      },
    });
    console.log("User updated");

    console.log("Onboarding completed successfully");
    return NextResponse.json("OK", {
      status: 200,
    });
  } catch (error){
    console.error("Database error:", error);
    return NextResponse.json("ERRORS.DB_ERROR", {
      status: 406,
      statusText: "Internal server error",
    });
  }
}
