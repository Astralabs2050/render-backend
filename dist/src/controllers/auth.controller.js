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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../service/auth.service");
class AuthController {
    constructor() {
        this.registerBrand = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.authService.registerBrandService(req.body);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.registerCreatorEmailVerification = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.authService.verifyCreator(req.body);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.registerCreator = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.authService.registerCreatorService(req.body);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.verifyOtp = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { otp, email } = req === null || req === void 0 ? void 0 : req.body;
            if (otp && email) {
                try {
                    const result = yield this.authService.verifyOtp(otp, email);
                    return res.json(result);
                }
                catch (err) {
                    return res.json({
                        status: false,
                        message: `An error occurred: ${err}`,
                    });
                }
            }
            else {
                return res.json({ status: false, message: "No OTP provided" });
            }
        });
        this.resendOtp = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { email } = req === null || req === void 0 ? void 0 : req.body;
            if (email) {
                try {
                    const result = yield this.authService.resendOtp(email);
                    return res.json(result);
                }
                catch (err) {
                    return res.json({
                        status: false,
                        message: `An error occurred: ${err}`,
                    });
                }
            }
            else {
                return res.json({ status: false, message: "Enter a valid email" });
            }
        });
        this.login = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.authService.login(req.body);
                return res.json(result);
            }
            catch (error) {
                return res.json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.getAuthUser = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req === null || req === void 0 ? void 0 : req.user;
                const result = yield this.authService.getAuthUser(id);
            }
            catch (error) {
                return {
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                };
            }
        });
        this.forgotPassword = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { email } = req.body;
                const response = yield this.authService.forgetPassword(email);
                return res.json(response);
            }
            catch (error) {
                return {
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                };
            }
        });
        this.resetPasswordLink = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.authService.resetPasswordLink(req.body);
                return res.json(response);
            }
            catch (error) {
                return {
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                };
            }
        });
        this.authService = new auth_service_1.AuthService();
    }
}
exports.AuthController = AuthController;
