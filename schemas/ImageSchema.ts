import { z } from "zod";

export const MAX_FILE_SIZE = 1000000; // 1 MB in bytes
export const SUPPORTED_FILE_TYPE = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
];

export const imageSchema = z.object({
    image: z
      .any()
      .optional()
      .refine(
        (file) => {
          if (!file) return true; // Skip validation if image is not provided
          return file.size <= MAX_FILE_SIZE;
        },
        "SCHEMA.IMAGE.MAX"
      )
      .refine(
        (file) => {
          if (!file) return true; // Skip validation if image is not provided
          return SUPPORTED_FILE_TYPE.includes(file.type);
        },
        "SCHEMA.IMAGE.SUPPORTED"
      ),
});

export type ImageSchema = z.infer<typeof imageSchema>;
