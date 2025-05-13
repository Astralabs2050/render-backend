import { uploadImageToS3 } from "../../util/aws";
import { design_onboarding_astra } from "../agent/collection.config";
import { CollectionModel, MediaModel } from "../model";
import client from "../socket/llm";
import { v4 as uuidv4 } from "uuid";

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

// ===== Main CollectionAgent Class =====

class CollectionAgent {
  private readonly AI_MODEL = "gpt-4.1";
  
  /**
   * Process collection agent requests for both images and text
   */
  public async collectionAgent(data: CollectionAgentData): Promise<AIModelResponse> {
    this.validateInput(data);

    try {
      let input: MessageItem[];
      let createdCollectionId: string | undefined;

      if (data.type === "input_image") {
        const result = await this.processImageInput(data);
        input = result.input;
        createdCollectionId = result.collectionId;
      } else {
        input = this.processTextInput(data);
      }

      const response = await this.sendToAIModel(input, data.previousId);
      
      // Update collection if necessary
      await this.updateCollectionIfNeeded(response, data.collectionId);

      return {
        id: response.id,
        response,
        collectionId: createdCollectionId || data.collectionId || ""
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Process multiple images in a single request
   */
  public async processMultipleImages(
    images: string[], 
    message: string = "", 
    previousId?: string,
    senderId: string = "defaultSenderId"
  ): Promise<AIModelResponse> {
    if (!images?.length) {
      throw new ImageProcessingError("Invalid or empty images array provided");
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
   * Convert file to base64 string
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
          
          const base64 = result.split(',')[1];
          if (!base64) {
            return reject(new Error("Invalid data URL format"));
          }
          
          resolve(base64);
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
   * Process multiple files to base64
   */
  public async processFiles(files: File[]): Promise<string[]> {
    if (!files?.length) {
      throw new Error("Invalid or empty files array provided");
    }
    
    const validFiles = files.filter(file => file instanceof File);
    
    if (!validFiles.length) {
      throw new Error("No valid File objects found in input");
    }
    
    return Promise.all(validFiles.map(file => this.fileToBase64(file)));
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
    
    // Upload images to S3
    const uploadedUrls = await this.uploadImagesToS3(imagesToUpload);
    
    // Create collection and media records
    const collection = await this.createCollectionWithMedia(
      uploadedUrls, 
      data.senderId
    );
    
    // Prepare AI input
    const input = this.createImageInput(uploadedUrls);
    
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
    
    return flattenedImages;
  }

  private async uploadImagesToS3(images: string[]): Promise<string[]> {
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
      try {
        const result = await uploadImageToS3("COLLECTION_IMAGE", images[i]);
        
        if (!result.success || !result.url) {
          throw new Error(result.message || 'Unknown error');
        }
        
        uploadedUrls.push(result.url);
      } catch (error) {
        throw new ImageProcessingError(
          `Failed to upload image ${i + 1}: ${error}`,
          error as Error
        );
      }
    }
    
    if (!uploadedUrls.length) {
      throw new ImageProcessingError("Failed to upload any images to S3");
    }
    
    return uploadedUrls;
  }

  private async createCollectionWithMedia(
    uploadedUrls: string[], 
    userId: string
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
            mediaType: "image",
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

  private createImageInput(uploadedUrls: string[]): MessageItem[] {
    const userContent: ContentItem[] = [
      { 
        type: "input_text", 
        text: "explain the design and material of this image" 
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
      price: finalDetails.pricePerOutfit,
      collectionName: finalDetails.brandName,
      deliveryTime: finalDetails.deliveryTime,
      deliveryRegion: finalDetails.region,
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
      
      return JSON.parse(outputText)?.userDetails || {};
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
}

export default new CollectionAgent();