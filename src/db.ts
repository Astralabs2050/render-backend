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
  EscrowDetailssModel,
  CollectionModel
} from "./model";

// Load environment variables
console.log("Current environment:", process.env.NODE_ENV);

// Set dialect based on environment
const dialect = process.env.NODE_ENV === "production" ? "postgres" : "mysql";

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
];

// Define sequelize options
const sequelizeOptions: any = {
  dialect: dialect as Dialect,
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  models: models,
};

let sequelize: Sequelize;

// Different connection approach based on environment
if (process.env.NODE_ENV === "production") {
  // Production: Use connection URL with PostgreSQL
  console.log("Using PostgreSQL connection URL for production");
  
  // Add PostgreSQL-specific SSL options
  sequelizeOptions.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  };
  
  sequelize = new Sequelize(dbConfig?.dbUrl, sequelizeOptions);
} else {
  // Development/other: Use individual MySQL connection parameters
  console.log("Using MySQL with individual connection parameters");
  
  sequelize = new Sequelize({
    database: process.env.DB_NAME,
    port: parseInt(process.env.DBPORT || "3306"),
    host: process.env.DB_HOST,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ...sequelizeOptions
  });
}

// Initialize the database
const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`Database connection established successfully using ${dialect}.`);
    
    // Sync models
    await sequelize.sync({ alter: true });
    console.log("Database schema synchronized.");
  } catch (error: any) {
    console.error("Database initialization error:", error.message);
  }
};

export { sequelize, initDB };