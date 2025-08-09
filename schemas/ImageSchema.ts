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
        "File size must be 1 MB or less"
      )
      .refine(
        (file) => {
          if (!file) return true; // Skip validation if image is not provided
          return SUPPORTED_FILE_TYPE.includes(file.type);
        },
        "File type must be JPEG, PNG, JPG, or WEBP"
      ),
});

export type ImageSchema = z.infer<typeof imageSchema>;
