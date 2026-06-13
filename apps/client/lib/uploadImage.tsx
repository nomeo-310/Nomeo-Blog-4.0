export const uploadImage = async ({ image, uploadPreset }: { image: File | null, uploadPreset: string }) => {
  try {
    if (!image) {
      throw new Error('No image provided');
    }

    const formData = new FormData();
    formData.append('file', image);
    formData.append('upload_preset', uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/dsopfgo7c/image/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary error response:', errorText);
      throw new Error(`Cloudinary upload failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error in uploadImage:', error);
    throw error;
  }
};