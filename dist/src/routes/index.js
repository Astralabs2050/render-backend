"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const authorization_1 = __importDefault(require("../middleware/authorization"));
const users_1 = __importDefault(require("./users"));
const design_1 = __importDefault(require("./design"));
const job_1 = __importDefault(require("./job"));
const waitlist_1 = __importDefault(require("./waitlist"));
const store_1 = __importDefault(require("./store"));
const routes = (0, express_1.Router)();
routes.use("/auth", auth_1.default);
routes.use("/user", authorization_1.default, users_1.default);
routes.use("/design", design_1.default);
routes.use("/job", job_1.default);
routes.use("/wait-list", waitlist_1.default);
routes.use("/store", store_1.default);
routes.get("/", (req, res) => {
    res.send("working now2");
});
exports.default = routes;
