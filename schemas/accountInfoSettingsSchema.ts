import { z } from "zod";

export const accountInfoSettingsSchema = z.object({
  username: z
    .string()
    .min(2, "SCHEMA.USERNAME.SHORT")
    .refine((username) => /^[a-zA-Z0-9]+$/.test(username), {
      message: "Only alphanumeric characters are allowed, no special characters.",
    })
    .optional(),
  name: z.string().optional(),
  surname: z.string().optional(),
  bio: z.string().max(160, "Bio must be 160 characters or less").optional(),
  joinedAt: z.string().optional()
});

export type AccountInfoSettingsSchema = z.infer<
  typeof accountInfoSettingsSchema
>;
