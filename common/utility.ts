import * as dotenv from "dotenv";

dotenv.config();
export const dbConfig: any = {
  dbname: process.env.DB_NAME,
  dbport: process.env.DBPORT,
  dbhost: process.env.DB_HOST,
  dbuser: process.env.DB_USER,
  dbpassword: process.env.DB_PASSWORD,
  dbUrl: process.env.POSTGRESS_URL,
};
