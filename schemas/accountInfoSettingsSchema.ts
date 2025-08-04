import { z } from "zod";

export const accountInfoSettingsSchema = z.object({
  username: z
    .string()
    .min(2, "SCHEMA.USERNAME.SHORT")
    .refine((username) => /^[a-zA-Z0-9]+$/.test(username), {
      message: "SCHEMA.USERNAME.SPECIAL_CHARS",
    })
    .optional(),
  language: z.string({
    required_error: "SCHEMA.LANGUAGE",
  }),
  name: z.string().optional(),
  surname: z.string().optional(),
  bio: z.string().max(160, "SCHEMA.BIO.MAX_LENGTH").optional(),
  joinedAt: z.string().optional(),
});

export type AccountInfoSettingsSchema = z.infer<
  typeof accountInfoSettingsSchema
>;
