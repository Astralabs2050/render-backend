import { Router } from "express";

import { AuthController } from "../controllers/auth.controller";
import isAuthenticated from "../middleware/authorization";

const authRouter = Router();
const authcontroller = new AuthController();

authRouter.post(
  "/register/brand",
  authcontroller.registerBrand.bind(authcontroller),
);

authRouter.post("/login", authcontroller.login.bind(authcontroller));

authRouter.post(
  "/register/creator/step-1",
  authcontroller.registerCreatorEmailVerification.bind(authcontroller),
);
authRouter.post(
  "/register/creator/step-2",
  authcontroller.registerCreator.bind(authcontroller),
);

authRouter.post(
  "/otp-verification",
  authcontroller.verifyOtp.bind(authcontroller),
);

authRouter.post("/resend-otp", authcontroller.resendOtp.bind(authcontroller));

authRouter.post(
  "/get-auth-user",
  isAuthenticated,
  authcontroller.getAuthUser.bind(authcontroller),
);

authRouter.post(
  "/forgot-password",
  authcontroller.forgotPassword.bind(authcontroller),
);

authRouter.patch(
  "/reset-password",
  authcontroller.resetPasswordLink.bind(authcontroller),
);

export default authRouter;
