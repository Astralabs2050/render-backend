import { Router } from "express";
import WaitlistController from "../controllers/waitlist.controller";

const waitListRouter = Router();

waitListRouter.post("/join", WaitlistController.joinWaitlist);

export default waitListRouter;
