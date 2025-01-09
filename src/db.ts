import { Sequelize } from "sequelize-typescript";
import { dbConfig } from "../common/utility";
import { Dialect } from "sequelize/types/sequelize";
import {
  UsersModel,
  MediaModel,
  BrandModel,
  CreatorModel,
  ProjectModel,
  WorkExperienceModel,
  DesignModel,
  PieceModel,
  JobModel,
  Waitlist,
  JobApplicationModel,
  JobApplicationProjects,
  SavedJobsModel,
  MessageModel,
  SalestModel,
  AnalysisModel,
  JobImpressionModel,
} from "./model";

// Load environment variables (ensure your .env file has POSTGRES_URL defined)

console.log("dbConfig?.dbUrl", dbConfig?.dbUrl);
// Define sequelize options
const sequelizeOptions: any = {
  dialect: "postgres" as Dialect,
  logging: process.env.NODE_ENV === "development" ? console.log : false, // Enable logging in development
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // This ensures SSL works even with self-signed certificates
    },
  },
  models: [
    UsersModel,
    MediaModel,
    BrandModel,
    CreatorModel,
    ProjectModel,
    WorkExperienceModel,
    DesignModel,
    PieceModel,
    JobModel,
    Waitlist,
    JobApplicationModel,
    JobApplicationProjects,
    SavedJobsModel,
    MessageModel,
    SalestModel,
    AnalysisModel,
    JobImpressionModel,
  ],
};

// Initialize Sequelize
const sequelize = new Sequelize(dbConfig?.dbUrl, sequelizeOptions);

// Initialize the database
const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    // Sync models
    await sequelize.sync({ alter: true });
    console.log("Database schema synchronized.");
  } catch (error: any) {
    console.error("Database initialization error:", error.message);
  }
};

export { sequelize, initDB };
