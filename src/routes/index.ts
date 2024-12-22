import { Router } from "express";
import authRouter from "./auth";
import isAuthenticated from "../middleware/authorization";
import userRouter from "./users";
import designRouter from "./design";
import jobRouter from "./job";
import waitListRouter from "./waitlist";
import storeRouter from "./store";
const routes = Router();

routes.use("/auth", authRouter);
routes.use("/user", isAuthenticated as any, userRouter);
routes.use("/design", designRouter);
routes.use("/job", jobRouter);
routes.use("/wait-list", waitListRouter);
routes.use("/store", storeRouter);
routes.get("/", (req, res) => {
  res.send("working now2");
});
export default routes;
