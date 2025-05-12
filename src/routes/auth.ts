import { RequestHandler, Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import isAuthenticated from "../middleware/authorization";

const authRouter = Router();
const authcontroller = new AuthController();

// @ts-ignore
authRouter.post(
  "/register/brand",
  authcontroller.registerBrand.bind(authcontroller) as any,
);

authRouter.patch(
  "/register/brand/step-2",
  authcontroller.registerBrandStep2.bind(authcontroller) as any
)

// @ts-ignore
authRouter.post("/login", authcontroller.login.bind(authcontroller) as any);

// @ts-ignore
authRouter.post(
  "/register/creator/step-1",
  authcontroller.registerCreatorEmailVerification.bind(authcontroller) as any,
);

// @ts-ignore
authRouter.post(
  "/register/creator/step-2",
  authcontroller.registerCreator.bind(authcontroller) as any,
);

// @ts-ignore
authRouter.post(
  "/otp-verification",
  authcontroller.verifyOtp.bind(authcontroller) as any,
);

// @ts-ignore
authRouter.post(
  "/resend-otp",
  authcontroller.resendOtp.bind(authcontroller) as any,
);

// @ts-ignore
authRouter.get(
  "/get-auth-user",
  isAuthenticated as any,
  authcontroller.getAuthUser.bind(authcontroller) as any,
);

// @ts-ignore
authRouter.post(
  "/forgot-password",
  authcontroller.forgotPassword.bind(authcontroller) as any,
);

// @ts-ignore
authRouter.patch(
  "/reset-password",
  authcontroller.resetPasswordLink.bind(authcontroller) as any,
);

export default authRouter;
