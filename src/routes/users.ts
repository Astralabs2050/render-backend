import { Router } from "express";
import { UserController } from "../controllers/user";
import isAuthenticated from "../middleware/authorization";

const userRouter = Router();

userRouter.get("/get/:userType/:level", UserController.getSelf as any);
userRouter.post("/upload-profile-image", UserController.uploadProfileImage as any);
userRouter.get("/self", isAuthenticated as any, UserController.getSelf as any);
userRouter.get("/project", isAuthenticated as any, UserController.getProjects as any);
userRouter.get("/creator-analytics",isAuthenticated as any, UserController.getAnalytics as any);
export default userRouter;
