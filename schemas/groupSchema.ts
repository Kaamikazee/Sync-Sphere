import { z } from "zod";
import { MAX_FILE_SIZE, SUPPORTED_FILE_TYPE } from "./ImageSchema";

const file = z
  .any()
  .refine((file) => file?.size <= MAX_FILE_SIZE, "SCHEMA.IMAGE.MAX")
  .refine(
    (file) => SUPPORTED_FILE_TYPE.includes(file?.type),
    "SCHEMA.IMAGE.SUPPORTED"
  )
  .optional()
  .nullable();

const groupName = z
  .string()
  .min(4, "Group name is too short.")
  .max(20, "Group name is too long.")
  .refine((username) => /^[a-zA-Z0-9]+$/.test(username), {
    message: "Group name must only contain letters and digits",
  });

export const groupSchema = z.object({
  groupName,
  file,
});

export const apiGroupSchema = z.object({
  groupName,
  file: z.string().optional().nullable(),
});

export type GroupSchema = z.infer<typeof groupSchema>;
export type ApiGroupSchema = z.infer<typeof apiGroupSchema>;
