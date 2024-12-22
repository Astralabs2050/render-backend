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
exports.handleSocketConnection = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const handleMessages_1 = require("./handleMessages");
const model_1 = require("../model");
const JWT_SECRET = process.env.JWT_SECRET;
const handleSocketConnection = (io) => {
    io.use((socket, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            const token = ((_b = (_a = socket === null || socket === void 0 ? void 0 : socket.handshake) === null || _a === void 0 ? void 0 : _a.headers) === null || _b === void 0 ? void 0 : _b.token) || ((_d = (_c = socket === null || socket === void 0 ? void 0 : socket.handshake) === null || _c === void 0 ? void 0 : _c.auth) === null || _d === void 0 ? void 0 : _d.token);
            console.log("token from socket12", socket);
            if (!token) {
                throw new Error("Unauthorized: Missing token");
            }
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            const currentTimestamp = Math.floor(Date.now() / 1000);
            if ((decoded === null || decoded === void 0 ? void 0 : decoded.exp) && (decoded === null || decoded === void 0 ? void 0 : decoded.exp) < currentTimestamp) {
                throw new Error("Unauthorized: Token Expired");
            }
            const userData = decoded === null || decoded === void 0 ? void 0 : decoded.data;
            console.log("userData", userData);
            if (userData) {
                userData === null || userData === void 0 ? true : delete userData.password;
            }
            socket.user = userData;
            socket.id = userData === null || userData === void 0 ? void 0 : userData.id;
            next();
        }
        catch (err) {
            console.error("JWT verification error:", err);
            return next(new Error("Unauthorized: Invalid token"));
        }
    }));
    io.on("connection", (socket) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`${socket.id} connected now`);
        // Emit connection status
        socket.emit("connection_status", true);
        //get the brands
        socket.on("get_brands", (data) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                console.log("Received data:", data); // Log incoming data
                if (!(socket === null || socket === void 0 ? void 0 : socket.id)) {
                    return socket.emit("error", { message: "User ID is required" });
                }
                console.log("Fetching jobs for user:", socket === null || socket === void 0 ? void 0 : socket.id);
                const jobs = yield model_1.JobModel.findAll({
                    where: {
                        userId: socket === null || socket === void 0 ? void 0 : socket.id, // Filters jobs based on the userId linked to the socket ID
                    },
                    include: [
                        {
                            model: model_1.UsersModel, // The related model
                            as: "maker", // The alias defined in the JobModel
                            required: false, // Include jobs even if no maker is associated
                            include: [
                                {
                                    model: model_1.CreatorModel,
                                    as: "creator", // Alias defined in UsersModel
                                },
                                {
                                    model: model_1.BrandModel,
                                    as: "brand", // Alias defined in UsersModel
                                },
                                {
                                    model: model_1.MediaModel,
                                    as: "media",
                                    where: {
                                        mediaType: "PROFILE_PICTURE", // Filter by mediaType = "PROFILE_PICTURE"
                                    },
                                    required: false, // Make it optional in case the user doesn't have a profile picture
                                },
                            ],
                            attributes: {
                                exclude: [
                                    "password",
                                    "isOtpVerified",
                                    "otpCreatedAt",
                                    "isOtpExp",
                                    "otp",
                                ],
                            }, // Exclude sensitive fields
                        },
                        {
                            model: model_1.UsersModel, // The related model
                            as: "user", // The alias defined in the JobModel
                            required: false, // Include jobs even if no maker is associated
                            include: [
                                {
                                    model: model_1.CreatorModel,
                                    as: "creator", // Alias defined in UsersModel
                                },
                                {
                                    model: model_1.BrandModel,
                                    as: "brand", // Alias defined in UsersModel
                                },
                                {
                                    model: model_1.MediaModel,
                                    as: "media",
                                    where: {
                                        mediaType: "PROFILE_PICTURE", // Filter by mediaType = "PROFILE_PICTURE"
                                    },
                                    required: false, // Make it optional in case the user doesn't have a profile picture
                                },
                            ],
                            attributes: {
                                exclude: [
                                    "password",
                                    "isOtpVerified",
                                    "otpCreatedAt",
                                    "isOtpExp",
                                    "otp",
                                ],
                            }, // Exclude sensitive fields
                        },
                        {
                            model: model_1.DesignModel, // The related model
                            as: "design", // The alias defined in the JobModel
                            required: false,
                        },
                    ],
                });
                //find jobs where the user is the maker
                const makersJob = yield model_1.JobModel.findAll({
                    where: {
                        makerId: socket === null || socket === void 0 ? void 0 : socket.id,
                    },
                    include: [
                        {
                            model: model_1.UsersModel, // The related model
                            as: "maker", // The alias defined in the JobModel
                            required: false, // Include jobs even if no maker is associated
                            include: [
                                {
                                    model: model_1.CreatorModel,
                                    as: "creator", // Alias defined in UsersModel
                                },
                                {
                                    model: model_1.BrandModel,
                                    as: "brand", // Alias defined in UsersModel
                                },
                                {
                                    model: model_1.MediaModel,
                                    as: "media",
                                    where: {
                                        mediaType: "PROFILE_PICTURE", // Filter by mediaType = "PROFILE_PICTURE"
                                    },
                                    required: false, // Make it optional in case the user doesn't have a profile picture
                                },
                            ],
                            attributes: {
                                exclude: [
                                    "password",
                                    "isOtpVerified",
                                    "otpCreatedAt",
                                    "isOtpExp",
                                    "otp",
                                ],
                            }, // Exclude sensitive fields
                        },
                        {
                            model: model_1.UsersModel, // The related model
                            as: "user", // The alias defined in the JobModel
                            required: false, // Include jobs even if no maker is associated
                            include: [
                                {
                                    model: model_1.CreatorModel,
                                    as: "creator", // Alias defined in UsersModel
                                },
                                {
                                    model: model_1.BrandModel,
                                    as: "brand", // Alias defined in UsersModel
                                },
                                {
                                    model: model_1.MediaModel,
                                    as: "media",
                                    where: {
                                        mediaType: "PROFILE_PICTURE", // Filter by mediaType = "PROFILE_PICTURE"
                                    },
                                    required: false, // Make it optional in case the user doesn't have a profile picture
                                },
                            ],
                            attributes: {
                                exclude: [
                                    "password",
                                    "isOtpVerified",
                                    "otpCreatedAt",
                                    "isOtpExp",
                                    "otp",
                                ],
                            }, // Exclude sensitive fields
                        },
                        {
                            model: model_1.DesignModel, // The related model
                            as: "design", // The alias defined in the JobModel
                            required: false,
                        },
                    ],
                });
                console.log("makersJob", makersJob);
                console.log("Fetched jobs:", [...jobs, ...makersJob]);
                socket.emit("brands", [...jobs, ...makersJob]); // Send jobs back to the client
            }
            catch (error) {
                console.error("Error in get_brands:", error);
                socket.emit("error", {
                    message: "An error occurred while fetching jobs",
                });
            }
        }));
        //handle private messages
        (0, handleMessages_1.handlePrivateMessage)(socket, io);
        //handle translation
        socket.on("translation", (data) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            try {
                const receiver = yield model_1.UsersModel.findOne({
                    where: { id: socket.id },
                    attributes: ["language"],
                });
                console.log("receiver111", (_a = receiver === null || receiver === void 0 ? void 0 : receiver.dataValues) === null || _a === void 0 ? void 0 : _a.language);
                const translatedMessage = yield (0, handleMessages_1.translateMessage)(data.message, (_b = receiver === null || receiver === void 0 ? void 0 : receiver.dataValues) === null || _b === void 0 ? void 0 : _b.language);
                socket.emit("translation", translatedMessage);
                console.log("translatedMessage", translatedMessage);
            }
            catch (error) {
                console.error("Error in translation:", error);
                socket.emit("error", {
                    message: "An error occurred while translating",
                });
            }
        }));
        //get private message
        (0, handleMessages_1.getPreviousMessages)(socket);
        // Handle disconnect
        socket.on("disconnect", () => __awaiter(void 0, void 0, void 0, function* () {
            console.log(`${socket.id} disconnected`);
        }));
    }));
};
exports.handleSocketConnection = handleSocketConnection;
