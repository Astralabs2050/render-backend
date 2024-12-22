import { Router } from "express";
import isAuthenticated from "../middleware/authorization";

const measurementRouter = Router();

measurementRouter.post("/upload-measurement", isAuthenticated as any);
 