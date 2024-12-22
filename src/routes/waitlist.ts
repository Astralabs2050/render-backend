import { Router } from "express";
import WaitlistController from "../controllers/waitlist.controller";

const waitListRouter = Router();

// @ts-ignore
waitListRouter.post("/join", WaitlistController.joinWaitlist);

export default waitListRouter;
