"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authorization_1 = __importDefault(require("../middleware/authorization"));
const measurementRouter = (0, express_1.Router)();
measurementRouter.post("/upload-measurement", authorization_1.default);
