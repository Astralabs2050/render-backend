"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const authorization_1 = __importDefault(require("../middleware/authorization"));
const authRouter = (0, express_1.Router)();
const authcontroller = new auth_controller_1.AuthController();
// @ts-ignore
authRouter.post("/register/brand", authcontroller.registerBrand.bind(authcontroller));
// @ts-ignore
authRouter.post("/login", authcontroller.login.bind(authcontroller));
// @ts-ignore
authRouter.post("/register/creator/step-1", authcontroller.registerCreatorEmailVerification.bind(authcontroller));
// @ts-ignore
authRouter.post("/register/creator/step-2", authcontroller.registerCreator.bind(authcontroller));
// @ts-ignore
authRouter.post("/otp-verification", authcontroller.verifyOtp.bind(authcontroller));
// @ts-ignore
authRouter.post("/resend-otp", authcontroller.resendOtp.bind(authcontroller));
// @ts-ignore
authRouter.post("/get-auth-user", authorization_1.default, authcontroller.getAuthUser.bind(authcontroller));
// @ts-ignore
authRouter.post("/forgot-password", authcontroller.forgotPassword.bind(authcontroller));
// @ts-ignore
authRouter.patch("/reset-password", authcontroller.resetPasswordLink.bind(authcontroller));
exports.default = authRouter;
