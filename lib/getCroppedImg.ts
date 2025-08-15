// lib/getCroppedImg.ts
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0
): Promise<Blob> {
  const image = await createImage(imageSrc);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const radians = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, radians);

  // set canvas to bounding box size
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate context to center and rotate the image
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(radians);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  // extract the cropped area from the rotated image
  // pixelCrop is relative to the original image's top-left before rotation, but when using react-easy-crop
  // the returned pixelCrop is relative to the rotated image's bounding box coords in many setups. If you
  // find the results slightly off, ensure the cropper is returning correct coordinates or adjust accordingly.

  // create final canvas of the crop size
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = Math.round(pixelCrop.width);
  outputCanvas.height = Math.round(pixelCrop.height);
  const outputCtx = outputCanvas.getContext('2d');
  if (!outputCtx) throw new Error('Canvas 2D context not available');

  // compute the offset of the original image's top-left within the rotated bounding box
  const dx = Math.round((bBoxWidth - image.width) / 2);
  const dy = Math.round((bBoxHeight - image.height) / 2);

  // The area to extract from the big rotated canvas
  const sx = Math.round(dx + pixelCrop.x);
  const sy = Math.round(dy + pixelCrop.y);
  const sWidth = Math.round(pixelCrop.width);
  const sHeight = Math.round(pixelCrop.height);

  // draw the extracted area onto the output canvas
  outputCtx.drawImage(canvas, sx, sy, sWidth, sHeight, 0, 0, outputCanvas.width, outputCanvas.height);

  // return blob
  return new Promise<Blob>((resolve, reject) => {
    outputCanvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Failed to create blob from canvas'));
      resolve(blob);
    }, 'image/jpeg', 0.92);
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

// returns {width, height} of the bounding box of a rotated rectangle
function rotateSize(width: number, height: number, radians: number) {
  const absCos = Math.abs(Math.cos(radians));
  const absSin = Math.abs(Math.sin(radians));
  return {
    width: Math.floor(width * absCos + height * absSin),
    height: Math.floor(width * absSin + height * absCos),
  };
}