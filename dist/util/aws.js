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
exports.uploadImageToS3 = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const https_1 = __importDefault(require("https"));
// Configure the AWS SDK
const s3 = new aws_sdk_1.default.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});
// Helper function to download an image from a URL
const fetchImageBufferFromUrl = (url) => {
    return new Promise((resolve, reject) => {
        https_1.default.get(url, (response) => {
            const data = [];
            response.on("data", (chunk) => data.push(chunk));
            response.on("end", () => resolve(Buffer.concat(data)));
            response.on("error", reject);
        });
    });
};
const uploadImageToS3 = (mediaType, data, id) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("data", data);
    const randomString = Math.ceil(1000000000 * Math.random()).toString();
    const fileName = `${mediaType}_${id || randomString}`;
    try {
        let fileData;
        if (typeof data === "string" && data.startsWith("http")) {
            // Fetch image from URL if data is a URL
            fileData = yield fetchImageBufferFromUrl(data);
        }
        else if (typeof data === "string" &&
            /^data:image\/\w+;base64,/.test(data)) {
            // Handle Base64-encoded string
            const base64Data = data.replace(/^data:image\/\w+;base64,/, "");
            fileData = Buffer.from(base64Data, "base64");
        }
        else if (Buffer.isBuffer(data)) {
            // Use buffer directly if data is already a Buffer
            fileData = data;
        }
        else {
            throw new Error("Invalid data format. Expected URL, Base64 string, or Buffer.");
        }
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: fileData,
            ContentType: mediaType,
            ACL: "public-read",
        };
        const result = yield s3.upload(params).promise();
        return {
            success: true,
            url: result.Location,
        };
    }
    catch (error) {
        const errorMessage = `Error ${typeof data === "string" && data.startsWith("http")
            ? "fetching image from URL"
            : "processing image"}: ${error.message}`;
        console.error(errorMessage, error);
        return {
            success: false,
            message: errorMessage,
            error,
        };
    }
});
exports.uploadImageToS3 = uploadImageToS3;
