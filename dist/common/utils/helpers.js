"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Helpers = void 0;
const bcrypt = require("bcrypt");
class Helpers {
    static generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    static async hashPassword(password) {
        const salt = await bcrypt.genSalt();
        return bcrypt.hash(password, salt);
    }
    static async comparePassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    static sanitizeUser(user) {
        const { password, otp, otpCreatedAt, ...result } = user;
        return result;
    }
    static isOtpExpired(otpCreatedAt) {
        if (!otpCreatedAt)
            return true;
        const now = new Date();
        const expirationTime = new Date(otpCreatedAt.getTime() + 15 * 60 * 1000);
        return now > expirationTime;
    }
    static logData(label, data) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`\n--- ${label} ---`);
            console.log(data);
            console.log('-------------------\n');
        }
    }
}
exports.Helpers = Helpers;
//# sourceMappingURL=helpers.js.map