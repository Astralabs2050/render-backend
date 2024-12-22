"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const secretKey = process.env.JWT_SECRET;
function isAuthenticated(req, res, next) {
    // Get the token from the request headers
    let token = req.header("Authorization");
    token = token && token.split(" ")[1];
    // Check if the token is missing
    if (!token) {
        return res.status(401).json({ message: "Unauthorized: Missing token" });
    }
    // Verify the token
    jsonwebtoken_1.default.verify(token, secretKey, (err, decoded) => {
        if (err) {
            console.error("JWT verification error:", err);
            return res.status(401).json({ message: "Unauthorized: Invalid token" });
        }
        // Check if the token has expired
        const currentTimestamp = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < currentTimestamp) {
            return res
                .status(401)
                .json({ message: "Unauthorized: Token has expired" });
        }
        // If the token is valid and not expired, you can access the user information in the decoded object
        let userData = decoded === null || decoded === void 0 ? void 0 : decoded.data;
        if (userData) {
            userData === null || userData === void 0 ? true : delete userData.password;
        }
        req.user = userData;
        // Call the next middleware or route handler
        next();
    });
}
exports.default = isAuthenticated;
