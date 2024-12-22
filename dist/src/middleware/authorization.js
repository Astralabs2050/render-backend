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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const secretKey = process.env.JWT_SECRET;
function isAuthenticated(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get the token from the request headers
            let token = req.header("Authorization");
            token = token && token.split(" ")[1];
            // Check if the token is missing
            if (!token) {
                res.status(401).json({ message: "Unauthorized: Missing token" });
                return;
            }
            // Verify the token
            const decoded = yield new Promise((resolve, reject) => {
                jsonwebtoken_1.default.verify(token, secretKey, (err, decoded) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(decoded);
                });
            });
            // Check if the token has expired
            const currentTimestamp = Math.floor(Date.now() / 1000);
            if (decoded.exp < currentTimestamp) {
                res.status(401).json({ message: "Unauthorized: Token has expired" });
                return;
            }
            // If the token is valid and not expired, you can access the user information in the decoded object
            let userData = decoded === null || decoded === void 0 ? void 0 : decoded.data;
            if (userData) {
                userData === null || userData === void 0 ? true : delete userData.password;
            }
            req.user = userData;
            // Call the next middleware or route handler
            next();
        }
        catch (err) {
            console.error("JWT verification error:", err);
            res.status(401).json({ message: "Unauthorized: Invalid token" });
        }
    });
}
exports.default = isAuthenticated;
