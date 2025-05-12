import { uploadImageToS3 } from "../../util/aws";
import { design_onboarding_astra } from "../agent/collection.config";
import { CollectionModel, MediaModel } from "../model";
import client from "../socket/llm";
import { v4 as uuidv4 } from "uuid";

/**
 * Custom error classes for specific error scenarios
 */
class ImageProcessingError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

class CollectionCreationError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'CollectionCreationError';
  }
}

class AIModelError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'AIModelError';
  }
}

/**
 * Types for content items in message payloads
 */
interface TextContentItem {
  type: "input_text";
  text: string;
}

interface ImageContentItem {
  type: "input_image";
  image_url: string;
}

type ContentItem = TextContentItem | ImageContentItem;

/**
 * Types for message roles and structure
 */
interface TextMessage {
  role: 'assistant' | 'user' | 'system';
  content: string;
}

interface MultiContentMessage {
  role: 'assistant' | 'user' | 'system';
  content: ContentItem[];
}

type MessageItem = TextMessage | MultiContentMessage;

/**
 * Input data for collection agent
 */
interface CollectionAgentData {
  type?: 'input_image' | 'input_text';
  image?: string;
  images?: string[];
  message?: string;
  previousId?: string;
  senderId: string;
  collectionId?: string;
}

/**
 * Request payload for AI model
 */
interface AIModelRequest {
  model: string;
  input: MessageItem[];
  store: boolean;
  previous_response_id?: string;
}

/**
 * Response from AI model
 */
interface AIModelResponse {
  id: string;
  [key: string]: any;
}

class CollectionAgent {
  /**
   * Collection agent function for processing multiple images and text inputs
   * Handles both image and text-based queries using AI model processing
   * @param data Input data containing message, image(s), and context
   * @returns Promise with AI model response
   * @throws {Error} Various error types based on failure point
   */
  public async collectionAgent(data: CollectionAgentData): Promise<AIModelResponse> {
    try {
      // Validate required input data
      if (!data) {
        throw new Error("Missing input data for collection agent");
      }

      if (!data.senderId) {
        throw new Error("Missing required senderId parameter");
      }

      let input: MessageItem[];
      let createdCollection;
      let finalDetails;

      // Handle image inputs
     if (data?.type === "input_image") {
  if (!data?.images?.length && !data?.image) {
    throw new ImageProcessingError("Missing images for input_image type - provide either 'image' or 'images' array");
  }

  try {
    // Upload all images to S3 and collect URLs
    const imagesToUpload = data?.images ?? (data.image ? [data.image] : []);
    
    if (imagesToUpload.length === 0) {
      throw new ImageProcessingError("No valid images provided for upload");
    }

    // Use the updated uploadImageToS3 function that handles arrays
    const uploadResult = await uploadImageToS3("COLLECTION_IMAGE", imagesToUpload);
    
    let uploadedUrls: string[] = [];
    
    // Handle the response based on whether it's a single upload or multiple
    if (uploadResult.success) {
      if (uploadResult.urls) {
        // Multiple images were uploaded
        uploadedUrls = uploadResult.urls;
      } else if (uploadResult.url) {
        // Single image was uploaded
        uploadedUrls = [uploadResult.url];
      }
    } else {
      throw new ImageProcessingError(uploadResult.message || "Failed to upload images to S3");
    }

    if (uploadedUrls.length === 0) {
      throw new ImageProcessingError("Failed to upload any images to S3");
    }

    // Create Collection
    try {
      createdCollection = await CollectionModel.create({
        id: uuidv4(),
        userId: data.senderId
      });
    } catch (dbError: any) {
      throw new CollectionCreationError(`Failed to create collection record: ${dbError.message}`, dbError);
    }

    // Create Media records linked to Collection
    try {
      await Promise.all(uploadedUrls.map(link => {
        return MediaModel.create({
          link,
          mediaType: "image",
          userId: data.senderId,
          collectionId: createdCollection!.id
        });
      }));
    } catch (mediaError: any) {
      // Clean up created collection if media creation fails
      if (createdCollection?.id) {
        try {
          await CollectionModel.destroy({ where: { id: createdCollection.id } });
        } catch (cleanupError) {
          console.error("Failed to clean up collection after media error:", cleanupError);
        }
      }
      throw new CollectionCreationError(`Failed to create media records: ${mediaError.message}`, mediaError);
    }

    // Prepare content array starting with the text prompt
    const userContent: ContentItem[] = [
      { type: "input_text", text: "explain the design or and material of this image" },
    ];

    // Add all uploaded URLs to the AI input
    uploadedUrls.forEach(url => {
      userContent.push({
        type: "input_image",
        image_url: url,
      });
    });

    input = [
      {
        role: "assistant",
        content: design_onboarding_astra.instructions
      },
      {
        role: "user",
        content: userContent,
      }
    ];
  } catch (imageError: any) {
    if (imageError instanceof ImageProcessingError || imageError instanceof CollectionCreationError) {
      throw imageError;
    }
    throw new ImageProcessingError(`Error processing images: ${imageError.message}`, imageError);
  }
}else {
        // Handle text inputs
        if (!data?.message || data.message.trim() === '') {
          throw new Error("Missing or empty message for text input");
        }

        input = [
          {
            role: "assistant",
            content: design_onboarding_astra.instructions
          },
          {
            role: "user", 
            content: data.message
          }
        ];
      }
      
      console.log("Input payload prepared:", input);
      
      // Prepare request for AI model
      const userInput: any = {
        model: "gpt-4.1",
        input,
        store: true,
      };
      
      // Add previous response ID if available for conversation continuity
      if (data?.previousId) {
        userInput.previous_response_id = data?.previousId;
      }
      
      // Send request to AI model and return response
      try {
        const response = await client.responses.create(userInput);
        
        // Safely parse JSON response
        try {
          const outputText = response?.output_text;
          if (outputText) {
            finalDetails = JSON.parse(outputText)?.userDetails || {};
          } else {
            console.warn("Received empty output_text from AI model");
            finalDetails = {};
          }
        } catch (parseError: any) {
          console.error("Failed to parse AI model response:", parseError);
          finalDetails = {};
        }
        
        // Update collection if finalDetails contains submitted data
        if (finalDetails && finalDetails?.submitted) {
          if (!data?.collectionId) {
            throw new Error('Missing collection ID for update');
          }
          
          try {
            const validCollection = await CollectionModel.findByPk(data?.collectionId);
            if (!validCollection) {
              throw new Error(`Collection with ID ${data.collectionId} not found`);
            }
            
            await validCollection.update({
              quantity: finalDetails?.quantity,
              price: finalDetails?.pricePerOutfit,
              collectionName: finalDetails?.brandName,
              deliveryTime: finalDetails?.deliveryTime,
              deliveryRegion: finalDetails?.region,
              description: finalDetails?.description
            });
          } catch (updateError: any) {
            throw new Error(`Failed to update collection: ${updateError.message}`);
          }
        }
        
        return {
          id: response.id,
          response,
          collectionId: createdCollection?.id || ""
        };
      } catch (aiError: any) {
        throw new AIModelError(`AI model request failed: ${aiError.message}`, aiError);
      }
    } catch (err: any) {
      // Log error with stack trace for debugging
      console.error("Collection agent error:", err.name || "Error", err.message, err.stack);
      
      // Rethrow with appropriate error type and message
      if (
        err instanceof ImageProcessingError || 
        err instanceof CollectionCreationError ||
        err instanceof AIModelError
      ) {
        throw err;
      }
      
      throw new Error(`Collection agent failed: ${err.message}`);
    }
  }

  /**
   * Function to handle multiple image uploads - sends all images in a single request
   * @param images Array of base64 encoded images
   * @param message Optional text message to accompany images
   * @param previousId Optional previous response ID for conversation context
   * @param senderId User ID for the request
   * @returns Promise with AI model response for all images
   * @throws {Error} If image processing fails
   */
  public async processMultipleImages(
    images: string[], 
    message: string = "", 
    previousId?: string,
    senderId: string = "defaultSenderId"
  ): Promise<AIModelResponse> {
    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new ImageProcessingError("Invalid or empty images array provided");
    }
    
    try {
      // Process all images in a single request
      const response = await this.collectionAgent({
        type: "input_image",
        images: images,
        message: message,
        previousId: previousId,
        senderId: senderId
      });
      
      return response;
    } catch (err: any) {
      console.error("Multiple image processing error:", err.name || "Error", err.message, err.stack);
      
      if (err instanceof ImageProcessingError) {
        throw err;
      }
      
      throw new ImageProcessingError(`Failed to process multiple images: ${err.message}`, err);
    }
  }
  
  /**
   * Alternative function to process images sequentially (one by one)
   * @param images Array of base64 encoded images
   * @param message Optional text message to accompany images
   * @param previousId Optional previous response ID for conversation context
   * @param senderId User ID for the request
   * @returns Promise with array of AI model responses
   * @throws {Error} If image processing fails
   */
  public async processImagesSequentially(
    images: string[], 
    message: string = "", 
    previousId?: string,
    senderId: string = "defaultSenderId"
  ): Promise<AIModelResponse[]> {
    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new ImageProcessingError("Invalid or empty images array provided");
    }
    
    try {
      // Process each image sequentially and collect responses
      const responses: AIModelResponse[] = [];
      
      for (const image of images) {
        if (!image) {
          console.warn("Skipping empty image in sequential processing");
          continue;
        }
        
        const response = await this.collectionAgent({
          type: "input_image",
          image: image,
          message: message,
          previousId: previousId,
          senderId: senderId
        });
        
        responses.push(response);
        
        // Use the latest response ID for conversation continuity
        previousId = response.id;
      }
      
      if (responses.length === 0) {
        throw new ImageProcessingError("No valid images were processed");
      }
      
      return responses;
    } catch (err: any) {
      console.error("Sequential image processing error:", err.name || "Error", err.message, err.stack);
      
      if (err instanceof ImageProcessingError) {
        throw err;
      }
      
      throw new ImageProcessingError(`Failed to process images sequentially: ${err.message}`, err);
    }
  }
  
  /**
   * Helper function to encode file to base64
   * @param file File object from input
   * @returns Promise with base64 string
   * @throws {Error} If file encoding fails
   */
  public async fileToBase64(file: File): Promise<string> {
    if (!file) {
      throw new Error("Invalid or missing file provided");
    }
    
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const result = reader.result as string;
          if (!result) {
            return reject(new Error("File reading resulted in empty data"));
          }
          
          // Extract only the base64 part without the data URL prefix
          const parts = result.split(',');
          if (parts.length !== 2) {
            return reject(new Error("Invalid data URL format"));
          }
          
          const base64 = parts[1];
          resolve(base64);
        } catch (parseError: any) {
          reject(new Error(`Failed to parse file data: ${parseError.message}`));
        }
      };
      
      reader.onerror = (error) => {
        reject(new Error(`Failed to read file: ${error}`));
      };
      
      try {
        reader.readAsDataURL(file);
      } catch (readError: any) {
        reject(new Error(`Failed to read file as data URL: ${readError.message}`));
      }
    });
  }

  /**
   * Process multiple files by converting them to base64
   * @param files Array of File objects
   * @returns Promise with array of base64 strings
   * @throws {Error} If file processing fails
   */
  public async processFiles(files: File[]): Promise<string[]> {
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new Error("Invalid or empty files array provided");
    }
    
    try {
      const validFiles = Array.from(files).filter(file => file instanceof File);
      
      if (validFiles.length === 0) {
        throw new Error("No valid File objects found in input");
      }
      
      const base64Promises = validFiles.map(file => this.fileToBase64(file));
      return Promise.all(base64Promises);
    } catch (err: any) {
      console.error("File processing error:", err.name || "Error", err.message, err.stack);
      throw new Error(`Failed to process files: ${err.message}`);
    }
  }
}

const collectionAgentInstance = new CollectionAgent();
export default collectionAgentInstance;