import { z } from "zod";

export const todoSchema = z.object({
    title: z.string().max(30, {
        message: "Title can be max of 30 letters"
    }),
    content: z.string().optional(),
    completed: z.enum(["DONE", "NOT_DONE", "HALF_DONE"])
})

export type TodoSchema = z.infer<typeof todoSchema>