import { z } from "zod";

export const timerSchema = z.object({
    activityName: z.string(),
    timeSpent: z.number().default(0).optional()
})

export type TimerSchema = z.infer<typeof timerSchema>