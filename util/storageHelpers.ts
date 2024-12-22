import cloudinary from "./cloudinary";

export const uploadImageToCloudinary = async (
  mediaType: string,
  data?: any,
  id?: string,
): Promise<{
  success: boolean;
  url?: string;
  message?: string;
  error?: any;
}> => {
  const randomString = Math.ceil(1000000000 * Math.random()).toString();

  try {
    const result = await cloudinary.uploader.upload(data, {
      resource_type: "auto",
      public_id: `${mediaType}_${id || randomString}`,
    });

    return {
      success: true,
      url: result.secure_url,
    };
  } catch (error) {
    console.error("Error uploading image:", error);
    return {
      success: false,
      message: "Error uploading image",
      error,
    };
  }
};
