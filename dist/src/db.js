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
exports.initDB = exports.sequelize = void 0;
const sequelize_typescript_1 = require("sequelize-typescript");
const utility_1 = require("../common/utility");
const model_1 = require("./model");
// Load environment variables (ensure your .env file has POSTGRES_URL defined)
console.log("dbConfig?.dbUrl", utility_1.dbConfig === null || utility_1.dbConfig === void 0 ? void 0 : utility_1.dbConfig.dbUrl);
// Define sequelize options
const sequelizeOptions = {
    dialect: "postgres",
    logging: process.env.NODE_ENV === "development" ? console.log : false, // Enable logging in development
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false, // This ensures SSL works even with self-signed certificates
        },
    },
    models: [
        model_1.UsersModel,
        model_1.MediaModel,
        model_1.BrandModel,
        model_1.CreatorModel,
        model_1.ProjectModel,
        model_1.WorkExperienceModel,
        model_1.DesignModel,
        model_1.PieceModel,
        model_1.JobModel,
        model_1.Waitlist,
        model_1.JobApplicationModel,
        model_1.JobApplicationProjects,
        model_1.SavedJobsModel,
        model_1.MessageModel,
        model_1.SalestModel,
        model_1.AnalysisModel,
    ],
};
// Initialize Sequelize
const sequelize = new sequelize_typescript_1.Sequelize(utility_1.dbConfig === null || utility_1.dbConfig === void 0 ? void 0 : utility_1.dbConfig.dbUrl, sequelizeOptions);
exports.sequelize = sequelize;
// Initialize the database
const initDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield sequelize.authenticate();
        console.log("Database connection established successfully.");
        // Sync models
        yield sequelize.sync({ alter: true });
        console.log("Database schema synchronized.");
    }
    catch (error) {
        console.error("Database initialization error:", error.message);
    }
});
exports.initDB = initDB;
