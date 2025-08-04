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
  .max(20, "Group name is too long.");

export const groupSchema = z
  .object({
    groupName,
    file,
    description: z.string().min(10).max(500).optional(),
    isPrivate: z.boolean().optional(),
    password: z.string().optional(),
  })
  .refine(
    (data) => !data.isPrivate || (data.password && data.password.length > 0),
    {
      message: "Password is required for private groups",
      path: ["password"],
    }
  );

export const apiGroupSchema = z.object({
  groupName,
  file: z.string().optional().nullable(),
  description: z.string().min(10).max(500).optional(),
  isPrivate: z.boolean().optional(),
  password: z.string().optional(),
  groupId: z.string().optional(),
});

export type GroupSchema = z.infer<typeof groupSchema>;
export type ApiGroupSchema = z.infer<typeof apiGroupSchema>;
