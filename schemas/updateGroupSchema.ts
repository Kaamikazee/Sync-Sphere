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
  .min(4, "Group name is too short. At least 4 characters are required.")
  .max(20, "Group name is too long. Max 20 characters are allowed.")
  .optional();

export const updateGroupSchema = z
  .object({
    groupName,
    file,
    description: z
      .string()
      .min(
        10,
        "Group description is too short. At least 10 characters are required."
      )
      .optional(),
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

export const apiUpdateGroupSchema = z.object({
  groupName,
  file: z.string().optional().nullable(),
  description: z.string().min(10).optional(),
  isPrivate: z.boolean().optional(),
  password: z.string().optional(),
  groupId: z.string().optional(),
});

export type UpdateGroupSchema = z.infer<typeof updateGroupSchema>;
export type ApiUpdateGroupSchema = z.infer<typeof apiUpdateGroupSchema>;
