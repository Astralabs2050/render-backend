"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_controller_1 = require("../controllers/store.controller");
const storeRouter = (0, express_1.Router)();
const authController = new store_controller_1.StoreController();
storeRouter.get("/analytics");
exports.default = storeRouter;
