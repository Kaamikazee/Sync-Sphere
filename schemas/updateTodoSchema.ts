import { z } from "zod";

export const priorityEnum = z.enum(["NONE", "LOW", "MEDIUM", "HIGH"]);

export const updateTodoSchema = z.object({
    title: z.string().max(30, {
        message: "Title can be max of 30 letters"
    }).optional(),
    content: z.string().optional(),
    completed: z.enum(["DONE", "NOT_DONE", "HALF_DONE"]).optional(),
    date: z.any().optional(), // Optional date field for the todo
    priority: priorityEnum.optional(), // <-- added
})

export type UpdateTodoSchema = z.infer<typeof updateTodoSchema>