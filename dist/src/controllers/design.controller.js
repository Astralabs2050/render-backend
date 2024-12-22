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
const design_service_1 = __importDefault(require("../service/design.service"));
class designController {
    constructor() {
        this.createNewDesign = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("reaching the controller");
                const { id } = req === null || req === void 0 ? void 0 : req.user;
                const response = yield design_service_1.default.generateNewDesign(req.body, id);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.uploadNewDesign = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req === null || req === void 0 ? void 0 : req.user;
                const response = yield design_service_1.default.uploadNewDesign(req.body, id);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.addCreatorToDesign = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { creator, designId } = req.body;
                const response = yield design_service_1.default.addCreatorToDesign(designId, creator);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
        this.additionalInfromation = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { designId } = req.body;
                const response = yield design_service_1.default.additionalInformation(designId, (_a = req.body) === null || _a === void 0 ? void 0 : _a.data);
                return res.json(response);
            }
            catch (error) {
                return res.status(400).json({
                    status: false,
                    message: `An error occurred: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
                });
            }
        });
    }
}
const DesignController = new designController();
exports.default = DesignController;
