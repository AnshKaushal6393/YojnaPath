const OUTPUT_IMAGE_SIZE = 400;
const PHOTO_QUALITY = 0.8;

async function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = window.URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      window.URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      window.URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load selected image"));
    };
    image.src = objectUrl;
  });
}

export async function resizeImageBlobToSquareBlob(blob) {
  const image = await loadImageFromBlob(blob);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_IMAGE_SIZE;
  canvas.height = OUTPUT_IMAGE_SIZE;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available");
  }

  const sourceSize = Math.min(image.width, image.height);
  const sourceX = Math.max(0, (image.width - sourceSize) / 2);
  const sourceY = Math.max(0, (image.height - sourceSize) / 2);

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (!nextBlob) {
          reject(new Error("Could not prepare the photo"));
          return;
        }
        resolve(nextBlob);
      },
      "image/jpeg",
      PHOTO_QUALITY
    );
  });
}

export async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the photo"));
    reader.readAsDataURL(blob);
  });
}

export async function resizeImageBlobToDataUrl(blob) {
  const resizedBlob = await resizeImageBlobToSquareBlob(blob);
  return blobToDataUrl(resizedBlob);
}
