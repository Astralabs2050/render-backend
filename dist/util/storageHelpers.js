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
exports.uploadImageToCloudinary = void 0;
const cloudinary_1 = __importDefault(require("./cloudinary"));
const uploadImageToCloudinary = (mediaType, data, id) => __awaiter(void 0, void 0, void 0, function* () {
    const randomString = Math.ceil(1000000000 * Math.random()).toString();
    try {
        const result = yield cloudinary_1.default.uploader.upload(data, {
            resource_type: "auto",
            public_id: `${mediaType}_${id || randomString}`,
        });
        return {
            success: true,
            url: result.secure_url,
        };
    }
    catch (error) {
        console.error("Error uploading image:", error);
        return {
            success: false,
            message: "Error uploading image",
            error,
        };
    }
});
exports.uploadImageToCloudinary = uploadImageToCloudinary;
