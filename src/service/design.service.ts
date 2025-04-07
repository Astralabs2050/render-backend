import axios from "axios";
import { creatorType, DesignModel } from "../model/design.model";
import { MediaModel } from "../model/media.model";
import { sequelize } from "../db"; // Import your sequelize instance
import { uploadImageToS3 } from "../../util/aws";
import { PieceModel, UsersModel } from "../model";
import OpenAI from "openai";
import { designConfig } from "../agent/design.config";

class DesignClass {
  // Method to generate new fashion design iterations
  public generateNewDesign = async (
    data: {
      prompt: string;
      fabricDelivary?: boolean; // Fabric delivery is optional
      image?: string; // Texture image is optional (base64 or URL)
      sketch?: string; // Design sketch is optional (base64 or URL)
      realisticMode?: boolean; // Option to generate more realistic designs
    },
    userId: string,
  ) => {
    const transaction = await sequelize.transaction(); // Start a new transaction
    try {
      // Initialize OpenAI client with API key
      const openai = new OpenAI({
        apiKey: process.env.OPEN_API_KEY,
      });
  
      // Helper function to determine if string is a URL or base64
      const isUrl = (str: string): boolean => {
        try {
          new URL(str);
          return str.startsWith('http://') || str.startsWith('https://');
        } catch {
          return false;
        }
      };
  
      // Helper function to prepare image for API (handle both URL and base64)
      const prepareImageForApi = (imageData: string): { type: string; image_url: string } => {
        if (isUrl(imageData)) {
          return { type: "input_image", image_url: imageData };
        } else {
          // Assuming base64 format
          return { type: "input_image", image_url: imageData };
        }
      };
  
      // Helper function to analyze images using OpenAI SDK
      const analyzeImage = async (imageData: string, prompt: string) => {
        try {
          const imageInput:any = prepareImageForApi(imageData);
          
          const response = await openai.responses.create({
            model: "gpt-4.5-preview-2025-02-27",
            input: [
              {
                role: "user",
                content: [
                  { type: "input_text", text: prompt },
                  imageInput,
                ],
              },
            ],
          });
  
          return response.output_text;
        } catch (error: any) {
          console.error(`Error in image analysis: ${error?.message || error}`);
          throw error;
        }
      };
  
      // Process texture image if provided
      let texture_info = "";
      if (data.image) {
        console.log("Analyzing texture from provided image...");
        const result = await analyzeImage(
          data.image,
          "Analyze this textile/fabric texture in detail. Describe the material, weave pattern, texture characteristics, and any visible properties that would be relevant for clothing design."
        );
        texture_info = result ?? "";
        console.log("Texture Analysis Result:", texture_info);
      }
  
      // Process sketch image if provided
      let sketch_info = "";
      if (data.sketch) {
        console.log("Analyzing design sketch...");
        const result = await analyzeImage(
          data.sketch,
          "Analyze this clothing design sketch in detail. Describe the silhouette, cut, style elements, proportions, notable features, and any design elements that should be preserved in the final design. Focus on translating the sketch into precise design terminology."
        );
        sketch_info = result ?? "";
        console.log("Sketch Analysis Result:", sketch_info);
      }
  
      // Enhanced prompt engine
      const prompt_engine = (prompt: string, texture_info = "", sketch_info = "", realistic = false) => {
        const texture_note = texture_info
          ? `
          * The material used to make the cloth should be as described below:
          -------------------------------
          ${texture_info}
          -------------------------------
          `
          : "";
  
        const sketch_note = sketch_info
          ? `
          * The design should follow the key elements from this sketch analysis:
          -------------------------------
          ${sketch_info}
          -------------------------------
          `
          : "";
       
        const realistic_note = realistic
          ? `
          * IMPORTANT: Create a realistic, manufacturable clothing design that a fashion designer could actually produce.
          * The design should consider practical construction methods, seam placements, and fabric behavior.
          * Avoid impossible or impractical elements that couldn't be physically created.
          * The image should look like a high-quality fashion photograph of a real garment on a model, not a digital illustration.
          `
          : "";
  
        return `
          Description: ${prompt}
          ---------------
          From the above text description, design a detailed, fashionable clothing item with the following considerations:
          * Focus on creating a cohesive, stylish design that matches the description
          * Include appropriate details like stitching, closures, and texture
          * Ensure the proportions and fit would be flattering on a human body
          ${texture_note}
          ${sketch_note}
          ${realistic_note}
          * Generate a clean, high-quality fashion design image that clearly shows the entire garment
        `;
      };
  
      // Function to generate design using OpenAI SDK with improved prompting
      const generateDesign = async () => {
        const imageResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: prompt_engine(data.prompt, texture_info, sketch_info, data.realisticMode ?? false),
          n: 1,
          size: "1024x1024",
          quality: "hd",
          style: data.realisticMode ? "natural" : "vivid", // Use natural style for realistic designs
        });
  
        return imageResponse.data[0].url;
      };
  
      // Generate iterations (configurable)
      const numIterations = 2; // Can be adjusted based on requirements
      const designPromises = Array(numIterations).fill(null).map(() => generateDesign());
      const imageUrls = await Promise.all(designPromises);
  
      // Check if the user exists
      const userExists = await UsersModel.findByPk(userId);
      if (!userExists) {
        await transaction.rollback();
        return { status: false, message: "User ID not found in the database." };
      }
  
      // Save the final prompt used for generation
      const finalPrompt = prompt_engine(data.prompt, texture_info, sketch_info, data.realisticMode ?? false);
  
      // Create a new design in the database
      const newDesign = await DesignModel.create(
        {
          prompt: finalPrompt,
          userId,
          fabricDelivary: data?.fabricDelivary,
          hasSketch: !!data.sketch,
          hasTextureReference: !!data.image,
          isRealistic: data.realisticMode ?? false,
        },
        { transaction },
      );
  
      console.log("New design created:", newDesign);
  
      // Helper function to save images to S3 based on whether they're URLs or base64
      const saveImageToS3 = async (mediaType: string, imageData: string) => {
        // If it's already a URL, just store the URL directly
        if (isUrl(imageData)) {
          return { success: true, url: imageData };
        } 
        // Otherwise, it's a base64 image that needs to be uploaded to S3
        else {
          return await uploadImageToS3(mediaType, imageData);
        }
      };
  
      // Save the generated images in the MediaModel and link them to the design
      const mediaEntries = imageUrls.filter((url): url is string => !!url).map(async (url: string, index: number) => {
        const aiImageToS3 = await saveImageToS3(`AI_GENERATED_IMAGE_${index + 1}`, url);
        console.log("aiImageToS3", aiImageToS3);
        
        // Check if the upload was successful
        if (!aiImageToS3.success) {
          console.warn("Failed to upload image to S3.");
          throw new Error("Failed to upload generated image. Please try again.");
        }
        
        return MediaModel.create(
          {
            link: aiImageToS3?.url,
            mediaType: `AI_GENERATED_IMAGE_${index + 1}`,
            designId: newDesign?.dataValues?.id,
          },
          { transaction },
        );
      });
  
      // If sketch was provided, also save it as reference media
      if (data.sketch) {
        const sketchToS3 = await saveImageToS3("USER_SKETCH", data.sketch);
        if (sketchToS3.success) {
          mediaEntries.push(
            MediaModel.create(
              {
                link: sketchToS3.url,
                mediaType: "USER_SKETCH",
                designId: newDesign?.dataValues?.id,
              },
              { transaction },
            )
          );
        }
      }
  
      // If texture image was provided, also save it as reference media
      if (data.image) {
        const textureToS3 = await saveImageToS3("TEXTURE_REFERENCE", data.image);
        if (textureToS3.success) {
          mediaEntries.push(
            MediaModel.create(
              {
                link: textureToS3.url,
                mediaType: "TEXTURE_REFERENCE",
                designId: newDesign?.dataValues?.id,
              },
              { transaction },
            )
          );
        }
      }
  
      await Promise.all(mediaEntries); // Await all media entries to be created
  
      await transaction.commit(); // Commit the transaction
  
      return {
        message: "Designs generated successfully.",
        data: {
          images: imageUrls,
          designId: newDesign?.dataValues?.id,
          prompt: finalPrompt,
          textureAnalysis: texture_info || undefined,
          sketchAnalysis: sketch_info || undefined,
        },
        status: true,
      };
    } catch (err: any) {
      if (transaction) await transaction.rollback();
  
      console.error("Error generating design:", err.message || err);
  
      let errorMessage = "An unexpected error occurred while generating designs.";
      if (err instanceof OpenAI.APIError) {
        console.error("OpenAI API Error:", err);
        errorMessage = `OpenAI API Error: ${err.message}`;
      } else if (err.name === "SequelizeValidationError") {
        errorMessage = "Database validation error: " + err.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
  
      return { status: false, message: errorMessage };
    }
  };
  public uploadNewDesign = async (data: any, userId: string) => {
    const transaction = await sequelize.transaction(); // Start a transaction
    try {
      // Destructure images from the data object
      const { images } = data;
      console.log("images", images);

      // Check if there are images to upload
      if (!images || images.length === 0) {
        return {
          message: "Please select an image to upload",
          status: false,
        };
      }

      // Upload all images in parallel to Cloudinary
      const uploadPromises = images.map((image: any) =>
        uploadImageToS3("UPLOAD_DESIGN_IMAGES", image, userId),
      );
      console.log("uploadPromises", uploadPromises);
      const imageResults = await Promise.all(uploadPromises);

      // Filter out failed uploads and log if any uploads failed
      const successfulUploads = imageResults.filter((result) => result.success);
      const failedUploads = imageResults.filter((result) => !result.success);

      if (failedUploads.length > 0) {
        console.warn("Some images failed to upload:", failedUploads);
        await transaction.rollback();
        return {
          message: "Some images failed to upload. Please try again.",
          status: false,
        };
      }

      // Collect only successful URLs for the database
      const imageLinks = successfulUploads.map((result) => result.url);

      // Create a new design in the database within the transaction
      const newDesign = await DesignModel.create(
        {
          prompt: "User uploaded design",
          userId,
          // Add other fields here if needed, such as outfitName or pieceNumber
        },
        { transaction }, // Pass the transaction object here
      );

      // Create media records for each uploaded image
      const mediaRecords = imageLinks.map((image_link: string) => ({
        link: image_link,
        mediaType: "USER_UPLOADED_IMAGES",
        designIds: newDesign.id, // Link to the newly created design
        userId,
      }));

      // Save all media records in bulk within the transaction
      await MediaModel.bulkCreate(mediaRecords, { transaction });

      // Commit the transaction if everything is successful
      await transaction.commit();

      return {
        message: "Images uploaded successfully",
        data: {
          images: imageLinks,
          designId: newDesign.id,
        },
        status: true,
      };
    } catch (err: any) {
      // Rollback the transaction in case of error
      await transaction.rollback();

      return {
        message: err?.message || "An error occurred during upload",
        status: false,
      };
    }
  };

  public addCreatorToDesign = async (
    designId: string,
    creator: creatorType,
  ) => {
    try {
      //check if the design id is valid
      const design = await DesignModel.findOne({
        where: { id: designId },
      });
      if (!design) {
        return {
          message: "No design found",
          status: false,
        };
      }
      //update design model
      await design.update({
        creatorType: creator,
      });
      return {
        message: "Creator added successfully",
        status: true,
        data: design,
      };
    } catch (err: any) {
      return {
        message: err?.message || "An error occurred during upload",
        status: false,
      };
    }
  };
  public additionalInformation = async (designId: string, data: any) => {
    const transaction = await sequelize.transaction();
    try {
      // Validate Design
      const design = await DesignModel.findOne({ where: { id: designId } });
      if (!design) {
        await transaction.rollback();
        return { message: "No design found", status: false };
      }

      // Update Design
      await design.update(
        { outfitName: data?.outfitName, pieceNumber: data?.pieceNumber },
        { transaction },
      );

      // Create Pieces
      const createdPieces = await Promise.all(
        data?.pieces?.map(async (piece: any) =>
          PieceModel.create(
            {
              designId: design.id,
              pieceType: piece.type,
              designNumber: piece.designNumber,
              piecePrice: piece.piecePrice,
            },
            { transaction },
          ),
        ),
      );

      // Prepare Image Data for Cloudinary Upload
      const imageUploads = data.imageData.map((image: any, index: number) => ({
        image: image.image,
        view: image.view,
        pieceId: createdPieces[index]?.id,
        type: image.view,
      }));

      const printUploads = data.prints.map((print: any, index: number) => ({
        image: print.image,
        pieceId: createdPieces[index]?.id,
        type: "PRINT",
      }));

      const allUploads = [...imageUploads, ...printUploads];

      // Upload All Images
      const uploadResults = await Promise.all(
        allUploads.map((upload) =>
          uploadImageToS3(upload.view || "PRINT", upload.image, upload.pieceId),
        ),
      );

      // Filter Successful and Failed Uploads
      const successfulUploads = uploadResults.filter(
        (result) => result.success,
      );
      const failedUploads = uploadResults.filter((result) => !result.success);

      if (failedUploads.length > 0) {
        console.warn("Some images failed to upload:", failedUploads);
        await transaction.rollback();
        return {
          message: "Some images failed to upload. Please try again.",
          status: false,
        };
      }

      // Create Media Records
      const mediaRecords = successfulUploads.map((result, index) => ({
        link: result.url,
        mediaType: allUploads[index].type,
        pieceId: allUploads[index].pieceId,
        designId: design.id,
      }));

      await MediaModel.bulkCreate(mediaRecords, { transaction });

      // Commit Transaction
      await transaction.commit();
      return { message: "Data saved successfully", status: true };
    } catch (err: any) {
      await transaction.rollback();
      return {
        message: err?.message || "An error occurred during upload",
        status: false,
      };
    }
  };
  public designAgent = async (message: string, userId: string, prevId?: string) => {
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPEN_API_KEY, // Fixed: Corrected environment variable name
      });
  
      // Build request payload with proper type
      const requestPayload: any = {
        model: "gpt-4.5-preview-2025-02-27",
        input: [
          { role: "system", content: designConfig.instructions },
          { role: "user", content: message },
        ],
        tools: designConfig.tools,
        store: true
      };
  
      // Only add previous_response_id if it exists
      if (prevId) {
        requestPayload.previous_response_id = prevId;
      }
  
      // Make API call
      const agentResponse:any = await openai.responses.create(requestPayload);
      
      // Handle responses with tool calls
      if (agentResponse?.output?.[0]?.arguments) {
        let args = agentResponse.output[0].arguments;
          console.log("argsss",args)
        // Parse arguments if they're a string
        if (typeof args === 'string') {
          try {
            args = JSON.parse(args);
          } catch (error) {
            console.error("Error parsing arguments:", error);
            throw new Error("Failed to parse arguments from AI response");
          }
        }
        
        // Validate required fields
        if (!args.fashion_type || !args.design_description) {
          throw new Error("Missing required arguments from AI response");
        }
        console.log("argsssss",args)
        // Generate design with validated arguments
        const generateDesign = await this.generateNewDesign(
          {
            prompt: `a user is trying to create this ${args.fashion_type}, this is more information about the design ${args.design_description}`,
            fabricDelivary: args.delivery_method,
            image: args.design_image,
            realisticMode:false
          },
          userId
        );
        
        return {
          status: true,
          message: "Design generated successfully",
          data: generateDesign
        };
      }
      
      // Handle text responses
      const outputText = JSON.parse(agentResponse?.output_text);

      const outputArgs = agentResponse?.output?.[0]?.arguments;
      console.log("agentResponse",outputText.user_input)
      if (outputText && !outputText.user_input) {
        // Text response
        return {
          message: "message from agent",
          data: {
            agentResponseData: outputText,
            id: agentResponse?.id,
            completed: false
          },
          status: true,
        };
      } else if (outputArgs && outputText.user_input) {
        // Parse arguments for design generation
        let parsedArgs;
        try {
          parsedArgs = typeof outputArgs === 'string' ? JSON.parse(outputArgs) : outputArgs;
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError);
          throw new Error("Failed to parse arguments from AI response");
        }
        
        // Validate required fields
        if (!parsedArgs.fashion_type || !parsedArgs.design_description) {
          throw new Error("Missing required arguments from AI response");
        }
        
        // Generate design with validated arguments
        const generateDesign = await this.generateNewDesign(
          {
            prompt: `a user is trying to create this ${ outputText.user_input?.fashion_type}, this is more information about the design ${  outputText.user_input?.design_description} `,
            fabricDelivary: outputText.user_input?.delivery_method,
            image: outputText.user_input?.design_image,
          },
          userId
        );
        
        return {
          status: true,
          message: "Design generated successfully",
          data: generateDesign
        };
      } else {
        // No recognized output format
        return {
          message: "Received unexpected response format",
          data: {
            agentResponseData: {},
            id: agentResponse?.id,
            completed: false
          },
          status: true,
        };
      }
    } catch (err: any) {
      console.error("Design agent error:", err);
      return {
        message: err?.message || "An error occurred",
        status: false,
        error: err.toString(), // Convert error to string instead of passing full error object
      };
    }
  };
}

// Export an instance of the DesignClass
const DesignService = new DesignClass();
export default DesignService;
