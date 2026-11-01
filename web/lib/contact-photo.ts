export async function prepareContactPhoto(blob: Blob): Promise<string> {
  if (!blob.size || blob.size > 12 * 1024 * 1024) throw new Error("Choose a photo smaller than 12 MB.");
  if (!/^image\//i.test(blob.type)) throw new Error("Choose an image from your photo library.");
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw new Error("This photo format couldn’t open. Try a JPEG or PNG."); });
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx || !image.naturalWidth || !image.naturalHeight) throw new Error("Couldn’t prepare this photo.");
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    ctx.drawImage(image, (image.naturalWidth-side)/2, (image.naturalHeight-side)/2, side, side, 0, 0, 512, 512);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally { URL.revokeObjectURL(url); }
}
export function photoBlob(data: string): Blob {
  const comma = data.indexOf(",");
  const bytes = Uint8Array.from(atob(data.slice(comma + 1)), c => c.charCodeAt(0));
  return new Blob([bytes], { type: data.slice(5, data.indexOf(";")) });
}
