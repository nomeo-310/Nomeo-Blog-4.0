'use server'

import cloudinary from "@/lib/cloudinary";

export const deleteImage = async (publicId:string) => {
  cloudinary.uploader.destroy(publicId, function(error: any,result: any) {
  }).then((response: any) => {
    return {response}; 
  })
    .catch((_err: any) => console.log("Something went wrong, please try again later.")
  );
};

export const deleteImages = async (images:string[]) => {
  try {
    const response = await cloudinary.api.delete_resources(images);
  } catch (error) {
    console.error('Error deleting images:', error);
  }
};