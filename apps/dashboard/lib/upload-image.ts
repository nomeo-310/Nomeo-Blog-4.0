/**
 * Uploads an image directly to Cloudinary from the browser via an unsigned
 * upload preset — same technique as the main client app's lib/uploadImage.tsx.
 */
export async function uploadImage({ file, uploadPreset }: { file: File; uploadPreset: string }): Promise<{ secure_url: string; public_id: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed (${response.status}): ${errorText}`);
  }

  return response.json();
}
