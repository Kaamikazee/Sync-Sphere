import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";
import db from "@/lib/db";
import { redirect } from "next/navigation";
// import dashboard from "../../page";

interface Params {
    params: {
        invite_code: string;
    };
    searchParams: {
        [key: string]: string | undefined;
      };
}

interface InviteCodeValidWhere {
    inviteCode: string;
    adminCode?: string;
    readOnlyCode?: string;
    canEditCode?: string;
}

const Group = async ({params: {invite_code}, searchParams }: Params) => {
    const session = await checkIfUserCompleteOnboarding(`/dashboard/invite/${invite_code}`)

    if (!session) {
        return <p>You need to sign in to access this page.</p>;
      }

      const role = searchParams.role as
    | "editor"
    | "admin"
    | "viewer"
    | null
    | undefined;
  const shareCode = searchParams.shareCode;

  if (!role || !shareCode || !invite_code) {
    redirect("dashboard/errors?error=no-data")
  }

  if (role !== "admin" && role !== "editor" && role !== "viewer") {
    redirect("/dashboard/errors?error=invalid-role")
  }

  let inviteCodeValidWhere: InviteCodeValidWhere = {
    inviteCode: invite_code
  }

  switch (role) {
    case "admin": {
      inviteCodeValidWhere = {
        ...inviteCodeValidWhere,
        adminCode: shareCode!,
      };
      break;
    }

    case "editor": {
      inviteCodeValidWhere = {
        ...inviteCodeValidWhere,
        canEditCode: shareCode!,
      };
      break;
    }

    case "viewer": {
      inviteCodeValidWhere = {
        ...inviteCodeValidWhere,
        readOnlyCode: shareCode!,
      };
      break;
    }

    default:
      redirect("/dashboard/errors?error=wrong-role");
      break;
  }

  const inviteCodeValid = await db.group.findUnique({
    where: {
        ...inviteCodeValidWhere
    }
  })

  if (!inviteCodeValid) {
    redirect("/dashboard/errors?error=outdated-invite-code")
  }

  const existingGroup = await db.group.findFirst({
    where: {
        inviteCode: invite_code,
        subscribers: {
            some: {
                userId: session.user.id
            }
        }
    }
  })

  if (existingGroup) {
    redirect(`/dashboard/groups/${existingGroup.id}`);
  }

  const userRole = () => {
    switch (role) {
      case "admin":
        return "ADMIN";
      case "editor":
        return "CAN_EDIT";
      case "viewer":
        return "READ_ONLY";
      default:
        return redirect("/dashboard/errors?error=wrong-role");
    }
  };

  await db.subscription.create({
    data: {
        userId: session.user.id,
        groupId: inviteCodeValid.id,
        userRole: userRole()
    }
  });

  redirect(`dashboard/groups/${inviteCodeValid.id}`)
}

export default Group