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
const nodemailer_1 = __importDefault(require("nodemailer"));
// Function to send an email
function sendEmail(receiverEmail, subject, message) {
    return __awaiter(this, void 0, void 0, function* () {
        // Create a transporter object using SMTP settings
        var smtpConfig = {
            host: "smtp.gmail.com",
            port: 465,
            secure: true, // use SSL
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        };
        const transporter = nodemailer_1.default.createTransport(smtpConfig);
        // Setup email data
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: receiverEmail,
            subject: subject,
            html: message, // Use 'html' to send HTML content
        };
        // Send the email
        try {
            yield transporter.sendMail(mailOptions);
            console.log("Email sent successfully!");
        }
        catch (error) {
            console.error("Error sending email:", error);
        }
    });
}
exports.default = sendEmail;
// Example usage
// Example usage
// const receiverEmail = "lawblaze4@gmail.com"; // Replace with actual recipient email
// const subject = "Thank you for trying out Astra!";
// const message = `<b>Test message</b>`; // HTML content
// sendEmail(receiverEmail, subject, message).catch(console.error);
