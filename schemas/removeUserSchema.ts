import { z } from "zod";

export const removeUserSchema = z.object({
    userId: z.string(),
    groupId: z.string()
})

export type RemoveUserRoleSchema = z.infer<typeof removeUserSchema>