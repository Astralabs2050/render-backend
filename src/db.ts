import { Sequelize } from "sequelize-typescript";
import { createClient } from '@supabase/supabase-js';
import * as dotenv from "dotenv";
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
  EscrowDetailssModel,
  CollectionModel
} from "./model";

// Load environment variables
dotenv.config();
console.log("Current environment:", process.env.NODE_ENV);
console.log("Supabase URL loaded:", !!process.env.SUPABASE_URL);
console.log("Supabase DB URL loaded:", !!process.env.SUPABASE_DB_URL);

const models = [
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
  EscrowDetailssModel,
  AnalysisModel,
  JobImpressionModel,
  CollectionModel
];

// Supabase client (only create if credentials exist)
let supabase: any = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

// Sequelize with Supabase PostgreSQL
let sequelize: Sequelize;
if (process.env.SUPABASE_DB_URL) {
  sequelize = new Sequelize(process.env.SUPABASE_DB_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    models: models,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
} else {
  throw new Error('SUPABASE_DB_URL is required. Please add it to your .env file.');
}

// Initialize the database
const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully');
    
    // Sync models
    await sequelize.sync({ alter: true });
    console.log("Database schema synchronized.");
  } catch (error: any) {
    console.error("Database initialization error:", error.message);
  }
};

export { sequelize, supabase, initDB };