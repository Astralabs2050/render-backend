import { Router } from "express";
import isAuthenticated from "../middleware/authorization";
import { StoreController } from "../controllers/store.controller";

const storeRouter = Router();
const authController = new StoreController();

storeRouter.get("/analytics");

export default storeRouter;
