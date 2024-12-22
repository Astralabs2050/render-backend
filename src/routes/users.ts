import { Router } from "express";
import { UserController } from "../controllers/user";
import isAuthenticated from "../middleware/authorization";

const userRouter = Router();

userRouter.get("/get/:userType/:level", UserController.getSelf);
userRouter.post("/upload-profile-image", UserController.uploadProfileImage);
userRouter.get("/self", isAuthenticated, UserController.getSelf);
userRouter.get("/project", isAuthenticated, UserController.getProjects);

export default userRouter;
