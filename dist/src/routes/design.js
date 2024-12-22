"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const design_controller_1 = __importDefault(require("../controllers/design.controller"));
const authorization_1 = __importDefault(require("../middleware/authorization"));
const designRouter = (0, express_1.Router)();
designRouter.post("/create-design", authorization_1.default, design_controller_1.default.createNewDesign);
designRouter.post("/post-design", authorization_1.default, design_controller_1.default.uploadNewDesign);
designRouter.patch("/add-creator", authorization_1.default, design_controller_1.default.addCreatorToDesign);
designRouter.patch("/additional-information", authorization_1.default, design_controller_1.default.additionalInfromation);
exports.default = designRouter;
