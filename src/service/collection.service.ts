import { uploadImageToS3 } from "../../util/aws";
import { design_onboarding_astra } from "../agent/collection.config";
import { CollectionModel, MediaModel } from "../model";
import client from "../socket/llm";
import { v4 as uuidv4 } from "uuid";
import fs from "fs"
// ===== Custom Error Classes =====

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

// ===== Type Definitions =====

interface TextContentItem {
  type: "input_text";
  text: string;
}

interface ImageContentItem {
  type: "input_image";
  image_url: string;
}

type ContentItem = TextContentItem | ImageContentItem;

interface TextMessage {
  role: 'assistant' | 'user' | 'system';
  content: string;
}

interface MultiContentMessage {
  role: 'assistant' | 'user' | 'system';
  content: ContentItem[];
}

type MessageItem = TextMessage | MultiContentMessage;

interface CollectionAgentData {
  type?: 'input_image' | 'input_text';
  image?: string;
  images?: string[];
  message?: string;
  previousId?: string;
  senderId: string;
  collectionId?: string;
}

interface AIModelRequest {
  model: string;
  input: MessageItem[];
  store: boolean;
  previous_response_id?: string;
}

interface AIModelResponse {
  id: string;
  response?: any;
  collectionId?: string;
  output_text?: string;
  [key: string]: any;
}

interface CollectionUpdateData {
  quantity?: number;
  price?: number;
  collectionName?: string;
  deliveryTime?: string;
  deliveryRegion?: string;
  description?: string;
}

interface ImageValidationOptions {
  maxSizeBytes?: number;
  allowedFormats?: string[];
  maxImageCount?: number;
}

interface UploadProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
}

// ===== Main CollectionAgent Class =====

class CollectionAgent {
  private readonly AI_MODEL = "gpt-4.1-mini";
  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  private readonly MAX_IMAGES_PER_REQUEST = 10;
  private readonly UPLOAD_RETRY_ATTEMPTS = 3;
  private readonly UPLOAD_RETRY_DELAY = 1000; // 1 second
  
  private uploadProgress: UploadProgress = {
    total: 0,
    completed: 0,
    failed: 0,
    percentage: 0
  };
  
  /**
   * Process collection agent requests for both images and text
   */
  public async collectionAgent(data: CollectionAgentData): Promise<AIModelResponse> {
    this.validateInput(data);

    try {
      let input: MessageItem[];
      let createdCollectionId: string | undefined;
       let generatedImageBase64: Buffer | undefined;

      if (data.type === "input_image") {
        const result = await this.processImageInput(data);
        input = result.input;
        createdCollectionId = result.collectionId;
      } else {
        input = this.processTextInput(data);
      }

      const response = await this.sendToAIModel(input, data.previousId);
      
      // Parse the response properly
      let userResponse: any;
      try {
        userResponse = response?.output_text ? JSON.parse(response.output_text) : null;
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        userResponse = null;
      }
      console.log("userResponse?.submitted",userResponse,userResponse?.design_description)
      // Handle image generation if needed
      if (userResponse?.submitted && userResponse?.design_description ) {
        console.log("this is reaching here")
        try {
          const imageResponse = await client.images.generate({
            model: "gpt-image-1",
            prompt: this.generatePrompt(
              userResponse.design_description, 
              userResponse.fabric, 
              '', 
              true
            ),
            n: 1,
            size: "1024x1024",
            
           
          });
          const image_base64:any = imageResponse.data[0].b64_json;
          const image_bytes = Buffer.from(image_base64, "base64");
          generatedImageBase64= image_bytes
          // fs.writeFileSync("test.png", image_bytes);
          // console.log("imageResponse",imageResponse)
          // Save generated image to the collection
          if (image_bytes && (createdCollectionId || data.collectionId)) {
             const uploadResult:any = await uploadImageToS3("COLLECTION_IMAGE", image_bytes);
              if (uploadResult.success && uploadResult.url) {
               MediaModel.create({
                link:uploadResult.url,
                mediaType:  "COLLECTION_COVER" ,
                userId:data.senderId,
                collectionId: createdCollectionId || data.collectionId
          })
              }
            
          }
         
        } catch (imageError) {
          console.error("Failed to generate design image:", imageError);
          // Don't throw - continue with the response even if image generation fails
        }
      }
      
      // Update collection if necessary
      await this.updateCollectionIfNeeded(response, createdCollectionId || data.collectionId);

      return {
        id: response.id,
        response,
        collectionId: createdCollectionId || data.collectionId || "",
        generatedImageBase64
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Generate prompt for image creation
   */
  private generatePrompt(
  description: string,
  textureInfo?: string,
  sketchInfo?: string,
  realistic?: boolean
): string {
  const textureNote = textureInfo
    ? `
    * The material or texture used for this fashion item should follow the description below:
    -------------------------------
    ${textureInfo}
    -------------------------------
    `
    : "";

  const sketchNote = sketchInfo
    ? `
    * The design should incorporate key elements from the sketch analysis below:
    -------------------------------
    ${sketchInfo}
    -------------------------------
    `
    : "";

  const realisticNote = realistic
    ? `
    * IMPORTANT: Create a realistic, manufacturable fashion design that a designer or artisan could actually produce.
    * the bacground should always be a solid color white(#fff) that provides goot contrast with the product.
    * Consider practical construction methods, materials, and structural integrity relevant to the type of fashion item.
    * Avoid fantastical or physically impossible elements.
    * The image should resemble a high-quality product photo or fashion shoot of a real item.
    `
    : "";

  return `
    Description: ${description}
    ---------------
    Based on the above description, design a detailed and stylish fashion item or accessory. Consider the following:
    * Focus on a cohesive design that fits the intended aesthetic and purpose
    * Include appropriate functional and decorative details (e.g., fasteners, stitching, texture, embellishments)
    * Ensure proportions, ergonomics, and usability make sense for the intended user
    ${textureNote}
    ${sketchNote}
    ${realisticNote}
    * Generate a clean, high-quality image that clearly shows the full design of the item
  `;
}


  /**
   * Save generated image to collection
   */
  private async saveGeneratedImage(base64: any, collectionId: string, userId: string): Promise<void> {
    try {
      // // Download and upload to S3
      // const response = await fetch(imageUrl);
      // const blob = await response.blob();
      // const base64 = await this.blobToBase64(blob);
      
      const uploadResult:any = await uploadImageToS3("COLLECTION_IMAGE", base64);
      
      if (uploadResult.success && uploadResult.url) {
        await MediaModel.create({
          link: uploadResult.url,
          mediaType: "image",
          userId,
          collectionId
        });
        
      }
      
    } catch (error) {
      console.error("Failed to save generated image:", error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Convert blob to base64
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Process multiple images in a single request with progress tracking
   */
  public async processMultipleImages(
    images: string[], 
    message: string = "", 
    previousId?: string,
    senderId: string = "defaultSenderId",
    onProgress?: (progress: UploadProgress) => void
  ): Promise<AIModelResponse> {
    if (!images?.length) {
      throw new ImageProcessingError("Invalid or empty images array provided");
    }
    
    // Set up progress tracking
    this.uploadProgress = {
      total: images.length,
      completed: 0,
      failed: 0,
      percentage: 0
    };
    
    // Notify initial progress
    if (onProgress) {
      onProgress(this.uploadProgress);
    }
    
    return this.collectionAgent({
      type: "input_image",
      images,
      message,
      previousId,
      senderId
    });
  }
  
  /**
   * Process images one by one sequentially
   */
  public async processImagesSequentially(
    images: string[], 
    message: string = "", 
    previousId?: string,
    senderId: string = "defaultSenderId"
  ): Promise<AIModelResponse[]> {
    if (!images?.length) {
      throw new ImageProcessingError("Invalid or empty images array provided");
    }
    
    const responses: AIModelResponse[] = [];
    let currentPreviousId = previousId;
    
    for (const image of images) {
      if (!image) {
        console.warn("Skipping empty image in sequential processing");
        continue;
      }
      
      const response = await this.collectionAgent({
        type: "input_image",
        image,
        message,
        previousId: currentPreviousId,
        senderId
      });
      
      responses.push(response);
      currentPreviousId = response.id;
    }
    
    if (!responses.length) {
      throw new ImageProcessingError("No valid images were processed");
    }
    
    return responses;
  }
  
  /**
   * Convert file to base64 string with validation
   */
  public async fileToBase64(file: File): Promise<string> {
    if (!file) {
      throw new Error("Invalid or missing file provided");
    }
    
    // Validate file size
    if (file.size > this.MAX_IMAGE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${this.MAX_IMAGE_SIZE} bytes`);
    }
    
    // Validate file type
    if (!this.ALLOWED_IMAGE_FORMATS.includes(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}. Allowed types: ${this.ALLOWED_IMAGE_FORMATS.join(', ')}`);
    }
    
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const result = reader.result as string;
          if (!result) {
            return reject(new Error("File reading resulted in empty data"));
          }
          
          const base64 = result.split(',')[1];
          if (!base64) {
            return reject(new Error("Invalid data URL format"));
          }
          
          resolve(result); // Return full data URL, not just base64 part
        } catch (error) {
          reject(new Error(`Failed to parse file data: ${error}`));
        }
      };
      
      reader.onerror = () => reject(new Error("Failed to read file"));
      
      try {
        reader.readAsDataURL(file);
      } catch (error) {
        reject(new Error(`Failed to read file as data URL: ${error}`));
      }
    });
  }

  /**
   * Process multiple files to base64 with validation
   */
  public async processFiles(files: File[]): Promise<string[]> {
    if (!files?.length) {
      throw new Error("Invalid or empty files array provided");
    }
    
    if (files.length > this.MAX_IMAGES_PER_REQUEST) {
      throw new Error(`Number of files exceeds maximum allowed (${this.MAX_IMAGES_PER_REQUEST})`);
    }
    
    const validFiles = files.filter(file => file instanceof File);
    
    if (!validFiles.length) {
      throw new Error("No valid File objects found in input");
    }
    
    const base64Promises = validFiles.map(async (file, index) => {
      try {
        return await this.fileToBase64(file);
      } catch (error) {
        throw new Error(`Failed to process file ${index + 1}: ${error}`);
      }
    });
    
    return Promise.all(base64Promises);
  }

  /**
   * Validate image data before processing
   */
  private validateImageData(imageData: string): void {
    if (!imageData || typeof imageData !== 'string') {
      throw new ImageProcessingError("Invalid image data format");
    }
    
    const base64Pattern = /^data:image\/(png|jpg|jpeg|gif|webp);base64,/;
    if (!base64Pattern.test(imageData)) {
      throw new ImageProcessingError("Image data must be a valid base64 data URL");
    }
    
    // Check for suspicious patterns that might indicate corrupted data
    const base64Part = imageData.split(',')[1];
    if (!base64Part || base64Part.length < 100) {
      throw new ImageProcessingError("Image data appears to be corrupted or too small");
    }
  }

  // ===== Private Helper Methods =====

  private validateInput(data: CollectionAgentData): void {
    if (!data) {
      throw new Error("Missing input data for collection agent");
    }

    if (!data.senderId) {
      throw new Error("Missing required senderId parameter");
    }

    if (data.type === "input_image" && !data.images?.length && !data.image) {
      throw new ImageProcessingError("Missing images for input_image type");
    }

    if (!data.type && (!data.message || !data.message.trim())) {
      throw new Error("Missing or empty message for text input");
    }
  }

  private async processImageInput(data: CollectionAgentData): Promise<{
    input: MessageItem[];
    collectionId: string;
  }> {
    // Prepare images for upload
    const imagesToUpload = this.getImagesToUpload(data);
    
    // Validate images before upload
    imagesToUpload.forEach(image => this.validateImageData(image));
    
    // Upload images to S3 with retry logic
    const uploadedUrls = await this.uploadImagesToS3WithRetry(imagesToUpload);
    
    // Create collection and media records
    const collection = await this.createCollectionWithMedia(
      uploadedUrls, 
      data.senderId
    );
    
    // Prepare AI input
    const input = this.createImageInput(uploadedUrls, data.message);
    
    return { input, collectionId: collection.id };
  }

  private processTextInput(data: CollectionAgentData): MessageItem[] {
    if (!data.message || !data.message.trim()) {
      throw new Error("Missing or empty message for text input");
    }

    return [
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

  private getImagesToUpload(data: CollectionAgentData): string[] {
    const images = data.images ?? (data.image ? [data.image] : []);
    const flattenedImages = images.flat();
    
    if (!flattenedImages.length) {
      throw new ImageProcessingError("No valid images provided for upload");
    }
    
    if (flattenedImages.length > this.MAX_IMAGES_PER_REQUEST) {
      throw new ImageProcessingError(
        `Number of images (${flattenedImages.length}) exceeds maximum allowed (${this.MAX_IMAGES_PER_REQUEST})`
      );
    }
    
    return flattenedImages;
  }

  private async uploadImagesToS3WithRetry(images: string[]): Promise<string[]> {
    const uploadResults: (string | null)[] = await Promise.all(
      images.map(async (image, index) => {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= this.UPLOAD_RETRY_ATTEMPTS; attempt++) {
          try {
            const url = await this.uploadSingleImage(image, index);
            this.uploadProgress.completed++;
            this.updateProgress();
            return url;
          } catch (error) {
            lastError = error as Error;
            console.warn(
              `Upload attempt ${attempt}/${this.UPLOAD_RETRY_ATTEMPTS} failed for image ${index + 1}:`,
              error
            );
            
            if (attempt < this.UPLOAD_RETRY_ATTEMPTS) {
              await this.delay(this.UPLOAD_RETRY_DELAY * attempt);
            }
          }
        }
        
        this.uploadProgress.failed++;
        this.updateProgress();
        console.error(`Failed to upload image ${index + 1} after ${this.UPLOAD_RETRY_ATTEMPTS} attempts`);
        return null;
      })
    );
    
    const successfulUploads = uploadResults.filter((url): url is string => url !== null);
    
    if (!successfulUploads.length) {
      throw new ImageProcessingError("Failed to upload any images to S3");
    }
    
    if (successfulUploads.length < images.length) {
      console.warn(
        `Only ${successfulUploads.length} out of ${images.length} images were uploaded successfully`
      );
    }
    
    return successfulUploads;
  }

  private async uploadSingleImage(image: string, index: number): Promise<string> {
    const result = await uploadImageToS3("COLLECTION_IMAGE", image);
    
    if (!result.success || !result.url) {
      throw new Error(
        result.message || `Failed to upload image ${index + 1}: Unknown error`
      );
    }
    
    return result.url;
  }

  private async createCollectionWithMedia(
    uploadedUrls: string[], 
    userId: string,
    cover?:boolean
  ): Promise<any> {
    let collection;
    
    try {
      collection = await CollectionModel.create({
        id: uuidv4(),
        userId
      });
    } catch (error) {
      throw new CollectionCreationError(
        `Failed to create collection record: ${error}`,
        error as Error
      );
    }
    
    try {
      await Promise.all(
        uploadedUrls.map(link => 
          MediaModel.create({
            link,
            mediaType: cover ? "COLLECTION_COVER" :"COLLECTION_IMAGE",
            userId,
            collectionId: collection.id
          })
        )
      );
    } catch (error) {
      await this.cleanupCollection(collection.id);
      throw new CollectionCreationError(
        `Failed to create media records: ${error}`,
        error as Error
      );
    }
    
    return collection;
  }

  private createImageInput(uploadedUrls: string[], message?: string): MessageItem[] {
    const userContent: ContentItem[] = [
      { 
        type: "input_text", 
        text: message || "explain the design and material of this image" 
      },
      ...uploadedUrls.map(url => ({
        type: "input_image" as const,
        image_url: url,
      }))
    ];

    return [
      {
        role: "assistant",
        content: design_onboarding_astra.instructions
      },
      {
        role: "user",
        content: userContent,
      }
    ];
  }

  private async sendToAIModel(
    input: MessageItem[], 
    previousId?: string
  ): Promise<AIModelResponse> {
    const request: any = {
      model: this.AI_MODEL,
      input,
      store: true,
      ...(previousId && { previous_response_id: previousId })
    };
    
    try {
      return await client.responses.create(request);
    } catch (error) {
      throw new AIModelError(
        `AI model request failed: ${error}`,
        error as Error
      );
    }
  }

  private async updateCollectionIfNeeded(
    response: AIModelResponse, 
    collectionId?: string
  ): Promise<void> {
    if (!collectionId) return;
    
    const finalDetails = this.parseAIResponse(response);
    
    if (!finalDetails?.submitted) return;
    
    const collection = await CollectionModel.findByPk(collectionId);
    if (!collection) {
      throw new Error(`Collection with ID ${collectionId} not found`);
    }
    
    await collection.update({
      quantity: finalDetails.quantity,
      price: finalDetails.pricePerOutfit || finalDetails.price,
      collectionName: finalDetails.brandName || finalDetails.collectionName,
      deliveryTime: finalDetails.deliveryTime,
      deliveryRegion: finalDetails.region || finalDetails.deliveryRegion,
      description: finalDetails.description
    } as CollectionUpdateData);
  }

  private parseAIResponse(response: AIModelResponse): any {
    try {
      const outputText = response?.output_text;
      if (!outputText) {
        console.warn("Received empty output_text from AI model");
        return {};
      }
      
      const parsed = JSON.parse(outputText);
      return parsed?.userDetails || parsed;
    } catch (error) {
      console.error("Failed to parse AI model response:", error);
      return {};
    }
  }

  private async cleanupCollection(collectionId: string): Promise<void> {
    try {
      await CollectionModel.destroy({ where: { id: collectionId } });
    } catch (error) {
      console.error("Failed to clean up collection:", error);
    }
  }

  private handleError(error: any): never {
    console.error("Collection agent error:", error.name || "Error", error.message, error.stack);
    
    if (
      error instanceof ImageProcessingError || 
      error instanceof CollectionCreationError ||
      error instanceof AIModelError
    ) {
      throw error;
    }
    
    throw new Error(`Collection agent failed: ${error.message}`);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private updateProgress(): void {
    this.uploadProgress.percentage = Math.round(
      ((this.uploadProgress.completed + this.uploadProgress.failed) / this.uploadProgress.total) * 100
    );
  }
}

export default new CollectionAgent();