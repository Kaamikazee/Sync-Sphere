import { z } from "zod";


export const onboardingSchema = z.object({
  username: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  surname: z.string().optional().nullable(),
});

export type OnboardingSchema = z.infer<typeof onboardingSchema>;
