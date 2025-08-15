// lib/imageUtils.ts
export async function resizeImage(
  file: File,
  maxWidth = 1024,
  quality = 0.8,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context not available");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob"));
              URL.revokeObjectURL(url);
              return;
            }
            const outType = blob.type || "image/jpeg";
            const newFile = new File([blob], file.name, { type: outType });
            resolve(newFile);
            URL.revokeObjectURL(url);
          },
          "image/jpeg",
          quality,
        );
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export function validateImage(
  file: File,
  {
    maxSize = 5_000_000, // 5MB default
    allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"],
  }: { maxSize?: number; allowedTypes?: string[] } = {},
): { valid: boolean; reason?: string } {
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, reason: "INVALID_TYPE" };
  }
  if (file.size > maxSize) {
    return { valid: false, reason: "FILE_TOO_LARGE" };
  }
  return { valid: true };
}
