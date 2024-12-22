"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_1 = require("../controllers/user");
const authorization_1 = __importDefault(require("../middleware/authorization"));
const userRouter = (0, express_1.Router)();
userRouter.get("/get/:userType/:level", user_1.UserController.getSelf);
userRouter.post("/upload-profile-image", user_1.UserController.uploadProfileImage);
userRouter.get("/self", authorization_1.default, user_1.UserController.getSelf);
userRouter.get("/project", authorization_1.default, user_1.UserController.getProjects);
exports.default = userRouter;
