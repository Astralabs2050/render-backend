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
const waitlist_model_1 = require("../model/waitlist.model");
class waitlistController {
    constructor() {
        this.joinWaitlist = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if the email already exists
                const existingWaitlistEntry = yield waitlist_model_1.Waitlist.findOne({
                    where: { email: req.body.email },
                });
                if (existingWaitlistEntry) {
                    return res.status(400).json({
                        message: "Email is already on the waitlist",
                        status: false,
                    });
                }
                // Create the new waitlist entry
                const waitlist = yield waitlist_model_1.Waitlist.create(req.body);
                return res.json({
                    message: "Added to waitlist",
                    status: true,
                });
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
const WaitlistController = new waitlistController();
exports.default = WaitlistController;
