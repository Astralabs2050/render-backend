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
exports.sendMessage = sendMessage;
exports.receiveMessage = receiveMessage;
exports.getPreviousMessages = getPreviousMessages;
exports.translateMessage = translateMessage;
exports.handlePrivateMessage = handlePrivateMessage;
exports.updateUserAvailability = updateUserAvailability;
exports.markAsRead = markAsRead;
exports.typing = typing;
const sequelize_1 = require("sequelize");
const model_1 = require("../model");
const ChatMessage_model_1 = require("../model/ChatMessage.model");
const sendMail_1 = __importDefault(require("../../util/sendMail"));
function sendMessage(io) { }
function receiveMessage(io) { }
const getMessages = (senderId, receiverId) => __awaiter(void 0, void 0, void 0, function* () {
    // Retrieve both sent and received messages for a conversation
    return ChatMessage_model_1.MessageModel.findAll({
        where: {
            [sequelize_1.Op.or]: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId },
            ],
        },
        order: [["createdAt", "ASC"]],
        include: [
            {
                model: model_1.UsersModel,
                as: "sender",
                attributes: {
                    exclude: ["password", "isOtpVerified", "otpCreatedAt", "isOtpExp"],
                }, // Exclude sensitive fields
                include: [
                    {
                        model: model_1.MediaModel,
                        as: "media",
                        required: false, // Allow messages without associated media
                    },
                ],
            },
            {
                model: model_1.UsersModel,
                as: "receiver",
                attributes: {
                    exclude: ["password", "isOtpVerified", "otpCreatedAt", "isOtpExp"],
                }, // Exclude sensitive fields
                include: [
                    {
                        model: model_1.MediaModel,
                        as: "media",
                        required: false,
                    },
                ],
            },
        ],
    });
});
const saveAndBroadcastMessage = (data) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
    try {
        // Check if the receiver is online
        const receiver = yield model_1.UsersModel.findOne({
            where: { id: data.receiverId },
            attributes: ["active"],
        });
        // Create the message with a seen status based on receiver's availability
        const message = yield ChatMessage_model_1.MessageModel.create({
            message: data.message,
            type: data.type,
            receiverId: data.receiverId,
            senderId: data.senderId,
            sent: true,
            seen: (_a = receiver === null || receiver === void 0 ? void 0 : receiver.active) !== null && _a !== void 0 ? _a : false,
            createdAt: data.createdAt,
        });
        // find the receiver on the database
        const receiverData = yield model_1.UsersModel.findOne({
            where: { id: data.receiverId },
            include: [
                {
                    model: model_1.CreatorModel,
                    as: "creator", // Alias defined in the association
                    required: false, // Make it optional in case the user is not a creator
                },
                {
                    model: model_1.BrandModel,
                    as: "brand", // Alias defined in the association
                    required: false, // Make it optional in case the user is not a brand
                },
            ],
        });
        const senderData = yield model_1.UsersModel.findOne({
            where: { id: data.senderId },
            include: [
                {
                    model: model_1.CreatorModel,
                    as: "creator", // Alias defined in the association
                    required: false, // Make it optional in case the user is not a creator
                },
                {
                    model: model_1.BrandModel,
                    as: "brand", // Alias defined in the association
                    required: false, // Make it optional in case the user is not a brand
                },
            ],
        });
        console.log("receiverData", (_d = (_c = (_b = receiverData === null || receiverData === void 0 ? void 0 : receiverData.dataValues) === null || _b === void 0 ? void 0 : _b.brand) === null || _c === void 0 ? void 0 : _c.dataValues) === null || _d === void 0 ? void 0 : _d.username);
        if (((_e = receiverData === null || receiverData === void 0 ? void 0 : receiverData.dataValues) === null || _e === void 0 ? void 0 : _e.email) &&
            ((_f = senderData === null || senderData === void 0 ? void 0 : senderData.dataValues) === null || _f === void 0 ? void 0 : _f.email) &&
            !(receiver === null || receiver === void 0 ? void 0 : receiver.active)) {
            (0, sendMail_1.default)((_g = receiverData === null || receiverData === void 0 ? void 0 : receiverData.dataValues) === null || _g === void 0 ? void 0 : _g.email, `You have a Message from ${((_k = (_j = (_h = senderData === null || senderData === void 0 ? void 0 : senderData.dataValues) === null || _h === void 0 ? void 0 : _h.creator) === null || _j === void 0 ? void 0 : _j.dataValues) === null || _k === void 0 ? void 0 : _k.fullName) ||
                ((_o = (_m = (_l = senderData === null || senderData === void 0 ? void 0 : senderData.dataValues) === null || _l === void 0 ? void 0 : _l.brand) === null || _m === void 0 ? void 0 : _m.dataValues) === null || _o === void 0 ? void 0 : _o.username)}`, `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
          <h2 style="color: #4CAF50;">You have a new message!</h2>
          <p>Hi ${((_r = (_q = (_p = receiverData === null || receiverData === void 0 ? void 0 : receiverData.dataValues) === null || _p === void 0 ? void 0 : _p.brand) === null || _q === void 0 ? void 0 : _q.dataValues) === null || _r === void 0 ? void 0 : _r.username) ||
                ((_u = (_t = (_s = receiverData === null || receiverData === void 0 ? void 0 : receiverData.dataValues) === null || _s === void 0 ? void 0 : _s.creator) === null || _t === void 0 ? void 0 : _t.dataValues) === null || _u === void 0 ? void 0 : _u.fullName) ||
                "there"},</p>
          <p>
            You have received a message from <strong>${((_x = (_w = (_v = senderData === null || senderData === void 0 ? void 0 : senderData.dataValues) === null || _v === void 0 ? void 0 : _v.creator) === null || _w === void 0 ? void 0 : _w.dataValues) === null || _x === void 0 ? void 0 : _x.fullName) ||
                ((_0 = (_z = (_y = senderData === null || senderData === void 0 ? void 0 : senderData.dataValues) === null || _y === void 0 ? void 0 : _y.brand) === null || _z === void 0 ? void 0 : _z.dataValues) === null || _0 === void 0 ? void 0 : _0.username) ||
                "a user"}</strong>.
          </p>
          <p>
            Please check your inbox for further details.
          </p>
          <p style="margin-top: 20px;">Thank you,</p>
          <p><strong>Your Team</strong></p>
        </div>
        `);
        }
        //send mail to the receiver
        return message;
    }
    catch (error) {
        console.error("Error in saveAndBroadcastMessage:", error);
        throw error;
    }
});
function getPreviousMessages(socket) {
    return __awaiter(this, void 0, void 0, function* () {
        socket.on("get_previous_messages", (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                const messages = yield getMessages(data.senderId, data.receiverId);
                socket.emit("previous_messages", messages);
            }
            catch (error) {
                console.error("Error retrieving previous messages:", error);
            }
        }));
    });
}
function translateMessage(message, language) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const apiKey = process.env.OPEN_API_KEY; // Ensure your OpenAI API key is set in environment variables
        const apiUrl = "https://api.openai.com/v1/chat/completions";
        if (!apiKey) {
            throw new Error("OpenAI API key is not set.");
        }
        const body = {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: `You are a translation assistant.` },
                { role: "user", content: `Translate the following message to ${language || "english"}, only return the translated text: "${message}"` },
            ],
            max_tokens: 100,
            temperature: 0.3,
        };
        const response = yield fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errorDetails = yield response.json();
            throw new Error(`OpenAI API request failed: ${response.status} - ${response.statusText} - ${JSON.stringify(errorDetails)}`);
        }
        const data = yield response.json();
        const translatedText = (_b = (_a = data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
        if (!translatedText) {
            throw new Error("Translation failed: No content returned from OpenAI.");
        }
        return translatedText.trim();
    });
}
function handlePrivateMessage(socket, io) {
    return __awaiter(this, void 0, void 0, function* () {
        socket.on("privateMessage", (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                const message = yield saveAndBroadcastMessage(data);
                io.to(data.receiverId).emit("privateMessage", message);
            }
            catch (error) {
                console.error("Error handling private message:", error);
            }
        }));
    });
}
function updateUserAvailability(status, id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield model_1.UsersModel.update({ active: status }, { where: { id } });
        }
        catch (error) {
            console.error("Error updating user availability:", error);
        }
    });
}
function markAsRead(io) {
    io.on("connection", (socket) => {
        socket.on("mark_as_read", (data) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield ChatMessage_model_1.MessageModel.update({ seen: true }, {
                    where: {
                        receiverId: data.receiverId,
                        senderId: data.senderId,
                        seen: false,
                    },
                });
                io.to(data.senderId).emit("message_read", {
                    receiverId: data.receiverId,
                });
            }
            catch (error) {
                console.error("Error in markAsRead:", error);
            }
        }));
    });
}
function typing(io) {
    io.on("connection", (socket) => {
        socket.on("typing", (data) => {
            try {
                io.to(data.receiverId).emit("typing", { senderId: data.senderId });
            }
            catch (error) {
                console.error("Error in typing:", error);
            }
        });
        socket.on("stop_typing", (data) => {
            try {
                io.to(data.receiverId).emit("stop_typing", { senderId: data.senderId });
            }
            catch (error) {
                console.error("Error in stop_typing:", error);
            }
        });
    });
}
