import { z } from "zod";

export const editUserRoleSchema = z.object({
    userId: z.string(),
    groupId: z.string(),
    userRole: z.enum(["ADMIN", "CAN_EDIT", "READ_ONLY"])
})

export type EditUserRoleSchema = z.infer<typeof editUserRoleSchema>