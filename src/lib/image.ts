// Compression d'image côté navigateur (pour rester léger en base et sous la limite Vercel de 4,5 Mo)
export async function compressImage(file: File, maxSide: number, quality: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Compression impossible"))), "image/jpeg", quality),
  );
}

export async function uploadScorePage(scoreId: number, file: File): Promise<void> {
  const [full, thumb] = await Promise.all([compressImage(file, 1800, 0.78), compressImage(file, 420, 0.7)]);
  const form = new FormData();
  form.append("file", full, "page.jpg");
  form.append("thumb", thumb, "thumb.jpg");
  const res = await fetch(`/api/scores/${scoreId}/images`, { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.text()) || "Échec de l'envoi");
}
