"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const design_model_1 = require("../model/design.model");
const media_model_1 = require("../model/media.model");
const db_1 = require("../db"); // Import your sequelize instance
const aws_1 = require("../../util/aws");
const model_1 = require("../model");
class DesignClass {
    constructor() {
        // Method to generate new fashion design iterations
        this.generateNewDesign = (data, userId) => __awaiter(this, void 0, void 0, function* () {
            const transaction = yield db_1.sequelize.transaction(); // Start a new transaction
            try {
                const apiKey = process.env.OPEN_API_KEY;
                const imageUrl = "https://api.openai.com/v1/images/generations"; // DALL·E endpoint
                // Helper function to analyze image texture
                const photo_to_text = (b64photo) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const resp = yield fetch("https://api.openai.com/v1/chat/completions", {
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
                        });
                        if (!resp.ok) {
                            throw new Error(`OpenAI API returned an error: ${resp.status} ${resp.statusText}`);
                        }
                        const jsonResponse = yield resp.json();
                        return jsonResponse.choices[0].message.content;
                    }
                    catch (error) {
                        console.error("Error in photo_to_text:", (error === null || error === void 0 ? void 0 : error.message) || error);
                        throw error;
                    }
                });
                let texture_info = "";
                if (data.image) {
                    console.log("Analyzing texture from provided image...");
                    texture_info = yield photo_to_text(data.image);
                    console.log("Texture Analysis Result:", texture_info);
                }
                // Generate prompt
                const prompt_engine = (prompt, texture_info = "") => {
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
                const generateDesign = () => __awaiter(this, void 0, void 0, function* () {
                    const imageResponse = yield axios_1.default.post(imageUrl, requestData, {
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                        },
                    });
                    return imageResponse.data.data[0].url;
                });
                // Generate four iterations
                const imageUrls = yield Promise.all([
                    generateDesign(),
                    generateDesign(),
                    generateDesign(),
                    generateDesign(),
                ]);
                // Check if the user exists
                const userExists = yield model_1.UsersModel.findByPk(userId);
                if (!userExists) {
                    return { status: false, message: "User ID not found in the database." };
                }
                // Create a new design in the database
                const newDesign = yield design_model_1.DesignModel.create({
                    prompt: prompt_engine(data.prompt, texture_info), // Save summarized prompt
                    userId,
                }, { transaction });
                console.log("New design created:", newDesign);
                // Save the generated images in the MediaModel and link them to the design
                const mediaEntries = imageUrls.map((url) => __awaiter(this, void 0, void 0, function* () {
                    return media_model_1.MediaModel.create({
                        link: url,
                        mediaType: "AI_GENERATED_IMAGE",
                        designIds: newDesign.id,
                    }, { transaction });
                }));
                yield Promise.all(mediaEntries); // Await all media entries to be created
                yield transaction.commit(); // Commit the transaction
                return {
                    message: "Designs generated successfully.",
                    data: {
                        images: imageUrls,
                        designId: newDesign.id,
                    },
                    status: true,
                };
            }
            catch (err) {
                if (transaction)
                    yield transaction.rollback();
                console.error("Error generating design:", err.message || err);
                let errorMessage = "An unexpected error occurred while generating designs.";
                if (err.response) {
                    console.error("OpenAI API Error Response:", err.response.data);
                    const apiError = err.response.data.error || err.response.data;
                    errorMessage = `API Error: ${JSON.stringify(apiError)}`;
                }
                else if (err.request) {
                    errorMessage = "Network error: No response received from the API.";
                }
                else if (err.name === "SequelizeValidationError") {
                    errorMessage = "Database validation error: " + err.message;
                }
                return { message: errorMessage, status: false };
            }
        });
        this.uploadNewDesign = (data, userId) => __awaiter(this, void 0, void 0, function* () {
            const transaction = yield db_1.sequelize.transaction(); // Start a transaction
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
                const uploadPromises = images.map((image) => (0, aws_1.uploadImageToS3)("UPLOAD_DESIGN_IMAGES", image, userId));
                console.log("uploadPromises", uploadPromises);
                const imageResults = yield Promise.all(uploadPromises);
                // Filter out failed uploads and log if any uploads failed
                const successfulUploads = imageResults.filter((result) => result.success);
                const failedUploads = imageResults.filter((result) => !result.success);
                if (failedUploads.length > 0) {
                    console.warn("Some images failed to upload:", failedUploads);
                    yield transaction.rollback();
                    return {
                        message: "Some images failed to upload. Please try again.",
                        status: false,
                    };
                }
                // Collect only successful URLs for the database
                const imageLinks = successfulUploads.map((result) => result.url);
                // Create a new design in the database within the transaction
                const newDesign = yield design_model_1.DesignModel.create({
                    prompt: "User uploaded design",
                    userId,
                    // Add other fields here if needed, such as outfitName or pieceNumber
                }, { transaction });
                // Create media records for each uploaded image
                const mediaRecords = imageLinks.map((image_link) => ({
                    link: image_link,
                    mediaType: "USER_UPLOADED_IMAGES",
                    designIds: newDesign.id, // Link to the newly created design
                    userId,
                }));
                // Save all media records in bulk within the transaction
                yield media_model_1.MediaModel.bulkCreate(mediaRecords, { transaction });
                // Commit the transaction if everything is successful
                yield transaction.commit();
                return {
                    message: "Images uploaded successfully",
                    data: {
                        images: imageLinks,
                        designId: newDesign.id,
                    },
                    status: true,
                };
            }
            catch (err) {
                // Rollback the transaction in case of error
                yield transaction.rollback();
                return {
                    message: (err === null || err === void 0 ? void 0 : err.message) || "An error occurred during upload",
                    status: false,
                };
            }
        });
        this.addCreatorToDesign = (designId, creator) => __awaiter(this, void 0, void 0, function* () {
            try {
                //check if the design id is valid
                const design = yield design_model_1.DesignModel.findOne({
                    where: { id: designId },
                });
                if (!design) {
                    return {
                        message: "No design found",
                        status: false,
                    };
                }
                //update design model
                yield design.update({
                    creatorType: creator,
                });
                return {
                    message: "Creator added successfully",
                    status: true,
                    data: design,
                };
            }
            catch (err) {
                return {
                    message: (err === null || err === void 0 ? void 0 : err.message) || "An error occurred during upload",
                    status: false,
                };
            }
        });
        this.additionalInformation = (designId, data) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const transaction = yield db_1.sequelize.transaction();
            try {
                // Validate Design
                const design = yield design_model_1.DesignModel.findOne({ where: { id: designId } });
                if (!design) {
                    yield transaction.rollback();
                    return { message: "No design found", status: false };
                }
                // Update Design
                yield design.update({ outfitName: data === null || data === void 0 ? void 0 : data.outfitName, pieceNumber: data === null || data === void 0 ? void 0 : data.pieceNumber }, { transaction });
                // Create Pieces
                const createdPieces = yield Promise.all((_a = data === null || data === void 0 ? void 0 : data.pieces) === null || _a === void 0 ? void 0 : _a.map((piece) => __awaiter(this, void 0, void 0, function* () {
                    return model_1.PieceModel.create({
                        designId: design.id,
                        pieceType: piece.type,
                        designNumber: piece.designNumber,
                        piecePrice: piece.piecePrice,
                    }, { transaction });
                })));
                // Prepare Image Data for Cloudinary Upload
                const imageUploads = data.imageData.map((image, index) => {
                    var _a;
                    return ({
                        image: image.image,
                        view: image.view,
                        pieceId: (_a = createdPieces[index]) === null || _a === void 0 ? void 0 : _a.id,
                        type: image.view,
                    });
                });
                const printUploads = data.prints.map((print, index) => {
                    var _a;
                    return ({
                        image: print.image,
                        pieceId: (_a = createdPieces[index]) === null || _a === void 0 ? void 0 : _a.id,
                        type: "PRINT",
                    });
                });
                const allUploads = [...imageUploads, ...printUploads];
                // Upload All Images
                const uploadResults = yield Promise.all(allUploads.map((upload) => (0, aws_1.uploadImageToS3)(upload.view || "PRINT", upload.image, upload.pieceId)));
                // Filter Successful and Failed Uploads
                const successfulUploads = uploadResults.filter((result) => result.success);
                const failedUploads = uploadResults.filter((result) => !result.success);
                if (failedUploads.length > 0) {
                    console.warn("Some images failed to upload:", failedUploads);
                    yield transaction.rollback();
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
                yield media_model_1.MediaModel.bulkCreate(mediaRecords, { transaction });
                // Commit Transaction
                yield transaction.commit();
                return { message: "Data saved successfully", status: true };
            }
            catch (err) {
                yield transaction.rollback();
                return {
                    message: (err === null || err === void 0 ? void 0 : err.message) || "An error occurred during upload",
                    status: false,
                };
            }
        });
    }
}
// Export an instance of the DesignClass
const DesignService = new DesignClass();
exports.default = DesignService;
