import axios from "axios";
import { creatorType, DesignModel } from "../model/design.model";
import { MediaModel } from "../model/media.model";
import { sequelize } from "../db"; // Import your sequelize instance
import { uploadImageToS3 } from "../../util/aws";
import { PieceModel, UsersModel } from "../model";

class DesignClass {
  // Method to generate new fashion design iterations
  public generateNewDesign = async (
    data: {
      prompt: string;
      image?: string; // Image is optional (base64)
    },
    userId: string,
  ) => {
    const transaction = await sequelize.transaction(); // Start a new transaction
    try {
      const apiKey = process.env.OPEN_API_KEY;
      const imageUrl = "https://api.openai.com/v1/images/generations"; // DALL·E endpoint

      // Helper function to analyze image texture
      const photo_to_text = async (b64photo: string) => {
        try {
          const resp = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "user",
                    content: [
                      { type: "text", text: "Summarize this texture..." },
                      { type: "image_url", image_url: { url: b64photo } },
                    ],
                  },
                ],
                max_tokens: 300,
              }),
            },
          );

          if (!resp.ok) {
            throw new Error(
              `OpenAI API returned an error: ${resp.status} ${resp.statusText}`,
            );
          }

          const jsonResponse = await resp.json();
          return jsonResponse.choices[0].message.content;
        } catch (error: any) {
          console.error("Error in photo_to_text:", error?.message || error);
          throw error;
        }
      };

      let texture_info = "";
      if (data.image) {
        console.log("Analyzing texture from provided image...");
        texture_info = await photo_to_text(data.image);
        console.log("Texture Analysis Result:", texture_info);
      }

      // Generate prompt
      const prompt_engine = (prompt: string, texture_info = "") => {
        const texture_note = texture_info
          ? `
          * the material used to make the cloth should be as stated below:
          -------------------------------
          ${texture_info}
          -------------------------------
        `
          : "";
        return `
          Description: ${prompt}
          ---------------
          From the above text description, extract various clothing attributes...
          ${texture_note}
        `;
      };

      // Prepare the request data for DALL·E (single iteration at a time)
      const requestData = {
        model: "dall-e-3",
        quality: "hd",
        prompt: prompt_engine(data.prompt, texture_info),
        n: 1, // Request one iteration at a time
        size: "1024x1024",
      };

      // Function to make API request
      const generateDesign = async () => {
        const imageResponse = await axios.post(imageUrl, requestData, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });

        return imageResponse.data.data[0].url;
      };

      // Generate four iterations
      const imageUrls = await Promise.all([
        generateDesign(),
        generateDesign(),
        generateDesign(),
        generateDesign(),
      ]);

      // Check if the user exists
      const userExists = await UsersModel.findByPk(userId);
      if (!userExists) {
        return { status: false, message: "User ID not found in the database." };
      }

      // Create a new design in the database
      const newDesign = await DesignModel.create(
        {
          prompt: prompt_engine(data.prompt, texture_info), // Save summarized prompt
          userId,
        },
        { transaction },
      );

      console.log("New design created:", newDesign);

      // Save the generated images in the MediaModel and link them to the design
      const mediaEntries = imageUrls.map(async (url: string) => {
        return MediaModel.create(
          {
            link: url,
            mediaType: "AI_GENERATED_IMAGE",
            designIds: newDesign.id,
          },
          { transaction },
        );
      });

      await Promise.all(mediaEntries); // Await all media entries to be created

      await transaction.commit(); // Commit the transaction

      return {
        message: "Designs generated successfully.",
        data: {
          images: imageUrls,
          designId: newDesign.id,
        },
        status: true,
      };
    } catch (err: any) {
      if (transaction) await transaction.rollback();

      console.error("Error generating design:", err.message || err);

      let errorMessage =
        "An unexpected error occurred while generating designs.";
      if (err.response) {
        console.error("OpenAI API Error Response:", err.response.data);
        const apiError = err.response.data.error || err.response.data;
        errorMessage = `API Error: ${JSON.stringify(apiError)}`;
      } else if (err.request) {
        errorMessage = "Network error: No response received from the API.";
      } else if (err.name === "SequelizeValidationError") {
        errorMessage = "Database validation error: " + err.message;
      }

      return { message: errorMessage, status: false };
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
}

// Export an instance of the DesignClass
const DesignService = new DesignClass();
export default DesignService;
