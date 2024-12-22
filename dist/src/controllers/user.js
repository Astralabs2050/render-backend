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
exports.UserController = void 0;
const helperFunctions_1 = require("../../util/helperFunctions");
const auth_service_1 = require("../service/auth.service");
class User {
    constructor() {
        this.uploadProfileImage = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { user, link } = req.body;
                const mediaType = "PROFILE_IMAGE";
                const uploadImage = yield (0, helperFunctions_1.uploadSingleMedia)(user === null || user === void 0 ? void 0 : user.id, mediaType, link, "user");
                if (uploadImage === null || uploadImage === void 0 ? void 0 : uploadImage.success) {
                    return res.json({
                        status: true,
                        message: mediaType + " uploaded",
                    });
                }
                else {
                    return res.json({
                        status: false,
                        message: mediaType + " upload failed " + (uploadImage === null || uploadImage === void 0 ? void 0 : uploadImage.message),
                    });
                }
            }
            catch (err) {
                return res.json({
                    status: false,
                    message: err,
                });
            }
        });
        this.getSelf = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req === null || req === void 0 ? void 0 : req.user;
            try {
                const response = yield this.authService.getAuthUser(id);
                return res.json(response);
            }
            catch (err) {
                return res.json({
                    status: false,
                    message: err,
                });
            }
        });
        this.getProjects = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req === null || req === void 0 ? void 0 : req.user;
            try {
                const response = yield this.authService.getProjects(id);
                return res.json(response);
            }
            catch (err) {
                return res.json({
                    status: false,
                    message: err,
                });
            }
        });
        this.authService = new auth_service_1.AuthService();
    }
}
exports.UserController = new User();
