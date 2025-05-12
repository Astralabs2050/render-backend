import { Request, Response } from "express";
import { AuthService } from "../service/auth.service";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  public registerBrand = async (req: Request, res: Response) => {
    try {
      const response = await this.authService.registerBrandService(req.body);
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };
  public async registerBrandStep2(req:Request, res: Response){
    try{
      const response = await this.authService.registerBrandStep2(req.body);
      return res.json(response)
    }catch(error:any){
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  }
  public registerCreatorEmailVerification = async (
    req: Request,
    res: Response,
  ) => {
    try {
      const response = await this.authService.verifyCreator(req.body);
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };
  public registerCreator = async (req: Request, res: Response) => {
    try {
      const response = await this.authService.registerCreatorService(req.body);
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };
  public verifyOtp = async (req: Request, res: Response) => {
    const { otp, email } = req?.body;

    if (otp && email) {
      try {
        const result = await this.authService.verifyOtp(otp, email);
        return res.json(result);
      } catch (err) {
        return res.json({
          status: false,
          message: `An error occurred: ${err}`,
        });
      }
    } else {
      return res.json({ status: false, message: "No OTP provided" });
    }
  };

  public resendOtp = async (req: Request, res: Response) => {
    const { email } = req?.body;
    if (email) {
      try {
        const result = await this.authService.resendOtp(email);
        return res.json(result);
      } catch (err) {
        return res.json({
          status: false,
          message: `An error occurred: ${err}`,
        });
      }
    } else {
      return res.json({ status: false, message: "Enter a valid email" });
    }
  };

  public login = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.login(req.body);
      return res.json(result);
    } catch (error: any) {
      return res.json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public getAuthUser = async (req: Request, res: Response) => {
    try {
      const { id } = (req as any)?.user;
      const result = await this.authService.getAuthUser(id);
      return res.json(result)
    } catch (error: any) {
      return {
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      };
    }
  };
  public forgotPassword = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const response = await this.authService.forgetPassword(email);
      return res.json(response);
    } catch (error: any) {
      return {
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      };
    }
  };

  public resetPasswordLink = async (req: Request, res: Response) => {
    try {
      const response = await this.authService.resetPasswordLink(req.body);
      return res.json(response);
    } catch (error: any) {
      return {
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      };
    }
  };
}
