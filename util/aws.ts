import AWS from 'aws-sdk';
import https from 'https';

// Initialize the S3 client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Helper function to download an image from a URL
const fetchImageBufferFromUrl = (url: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const data: Uint8Array[] = [];
      response.on("data", (chunk) => data.push(chunk));
      response.on("end", () => resolve(Buffer.concat(data)));
      response.on("error", reject);
    });
  });
};

// Function to upload a single image to S3
const uploadSingleImageToS3 = async (
  mediaType: string,
  data: Buffer | string,
  id?: string,
): Promise<{
  success: boolean;
  url?: string;
  message?: string;
  error?: any;
}> => {
  // Create a random file name if no ID is provided
  const randomString = Math.ceil(1000000000 * Math.random()).toString();
  const fileName = `${mediaType}_${id || randomString}`;

  try {
    let fileData: Buffer;

    // Check if data is a URL (starts with 'http')
    if (typeof data === "string" && data.startsWith("http")) {
      console.log("Fetching image from URL:", data);
      fileData = await fetchImageBufferFromUrl(data);
    // Check if data is a Base64 string (starts with 'data:image/')
    } else if (
      typeof data === "string" &&
      /^data:image\/[a-zA-Z0-9+.-]+;base64,/.test(data)
    ) {
      console.log("Processing Base64 string.");
      const base64Data = data.replace(
        /^data:image\/[a-zA-Z0-9+.-]+;base64,/,
        "",
      );
      fileData = Buffer.from(base64Data, "base64");
    // If data is already a Buffer, use it directly
    } else if (Buffer.isBuffer(data)) {
      console.log("Data is already a Buffer.");
      fileData = data;
    } else {
      throw new Error(
        "Invalid data format. Expected URL, Base64 string, or Buffer.",
      );
    }

    // Upload the image to S3
    const params: AWS.S3.PutObjectRequest = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileName,
      Body: fileData,
      ContentType: mediaType,
      ACL: "public-read",
    };

    const result = await s3.upload(params).promise();

    return {
      success: true,
      url: result.Location,
    };
  } catch (error: any) {
    const errorMessage = `Error ${
      typeof data === "string" && data.startsWith("http")
        ? "fetching image from URL"
        : "processing image"
    }: ${error.message}`;
    console.error(errorMessage, error);

    return {
      success: false,
      message: errorMessage,
      error,
    };
  }
};

// Main function to upload image(s) to S3
export const uploadImageToS3 = async (
  mediaType: string,
  data: Buffer | string | Buffer[] | string[],
  id?: string,
): Promise<{
  success: boolean;
  url?: string;
  urls?: string[];
  message?: string;
  error?: any;
}> => {
  console.log("Received data:", data);

  try {
    // Check if data is an array
    if (Array.isArray(data)) {
      console.log(`Processing array of ${data.length} items`);
      const uploadPromises = data.map((item, index) => 
        uploadSingleImageToS3(
          mediaType, 
          item, 
          id ? `${id}_${index}` : undefined
        )
      );
      
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(r => r.success);
      
      if (successfulUploads.length === results.length) {
        return {
          success: true,
          urls: successfulUploads.map(r => r.url!),
        };
      } else {
        const failedUploads = results.filter(r => !r.success);
        return {
          success: false,
          message: `Failed to upload ${failedUploads.length} out of ${results.length} images`,
          urls: successfulUploads.map(r => r.url!),
          error: failedUploads.map(r => r.error),
        };
      }
    } else {
      // Handle single image upload
      const result = await uploadSingleImageToS3(mediaType, data, id);
      return result;
    }
  } catch (error: any) {
    console.error("Error processing image(s):", error);
    return {
      success: false,
      message: `Error processing image(s): ${error.message}`,
      error,
    };
  }
};

// Optional: Function to upload multiple images separately
export const uploadMultipleImagesToS3 = async (
  mediaType: string,
  dataArray: (Buffer | string)[],
  idPrefix?: string,
): Promise<{
  success: boolean;
  results: Array<{
    success: boolean;
    url?: string;
    message?: string;
    error?: any;
  }>;
}> => {
  const uploadPromises = dataArray.map((data, index) => 
    uploadSingleImageToS3(
      mediaType, 
      data, 
      idPrefix ? `${idPrefix}_${index}` : undefined
    )
  );
  
  const results = await Promise.all(uploadPromises);
  const allSuccessful = results.every(r => r.success);
  
  return {
    success: allSuccessful,
    results,
  };
};