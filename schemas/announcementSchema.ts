import { z } from "zod";

export const announcementSchema = z.object({
  title: z.string().max(15, {
    message: "Title can be max of 15 letters",
  }),
  content: z.object({
    type: z.string(), // usually "doc"
    content: z.array(z.any()), // children nodes, we accept any here for simplicity
  }),
  // completed: z.enum(["DONE", "NOT_DONE", "HALF_DONE"])
});

export type AnnouncementSchema = z.infer<typeof announcementSchema>;
