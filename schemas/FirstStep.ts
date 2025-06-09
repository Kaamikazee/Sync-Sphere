import { z } from "zod";

export const firstStepSchema = z.object({
  username: z
    .string()
    .refine((username) => /^[a-zA-Z0-9]+$/.test(username), {
      message: "Username must only contain letters and digits",
    })
    .optional(),

  name: z.string().optional(),
  surname: z.string().optional(),
});

export type FirstStepSchema = z.infer<typeof firstStepSchema>;
