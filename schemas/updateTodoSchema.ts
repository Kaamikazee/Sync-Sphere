import { z } from "zod";

export const updateTodoSchema = z.object({
    title: z.string().max(20, {
        message: "Title can be max of 20 letters"
    }).optional(),
    content: z.string().optional(),
    completed: z.enum(["DONE", "NOT_DONE", "HALF_DONE"])
})

export type UpdateTodoSchema = z.infer<typeof updateTodoSchema>