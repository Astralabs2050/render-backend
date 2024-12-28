import { Request, Response } from "express";
import { UsersModel } from "../model";
import {
  getSingleUploadedMedia,
  uploadSingleMedia,
} from "../../util/helperFunctions";
import { AuthService } from "../service/auth.service";
import { AnalyticsService } from "../service/analytics.service";

class User {
  private authService: AuthService;
  private analyticsService: AnalyticsService;

  constructor() {
    this.authService = new AuthService();
    this.analyticsService = new AnalyticsService();
  }
  public uploadProfileImage = async (req: any, res: Response) => {
    try {
      const { user, link } = req.body;
      const mediaType = "PROFILE_IMAGE";
      const uploadImage = await uploadSingleMedia(
        user?.id,
        mediaType,
        link,
        "user",
      );
      if (uploadImage?.success) {
        return res.json({
          status: true,
          message: mediaType + " uploaded",
        });
      } else {
        return res.json({
          status: false,
          message: mediaType + " upload failed " + uploadImage?.message,
        });
      }
    } catch (err) {
      return res.json({
        status: false,
        message: err,
      });
    }
  };
  public getSelf = async (req: any, res: Response) => {
    const { id } = req?.user;
    try {
      const response = await this.authService.getAuthUser(id);
      return res.json(response);
    } catch (err: any) {
      return res.json({
        status: false,
        message: err,
      });
    }
  };

  public getAnalytics = async (req: any, res: Response) => {
    try{
      const { id } = req?.user;
      const response = await this.analyticsService.getAnalytics(id)
      return res.json(response);
    } catch (err:any) {
      return res.json({
        status: false,
        message: err,
      });
    }
  }

  public getImpressions = async (req: any, res: Response) => {
    try{
      const { id } = req?.user;
      const response = await this.analyticsService.impressionWithRespectToTime(id)
      return res.json(response);
    } catch (err:any) {
      return res.json({
        status: false,
        message: err,
      });
    }
  }

  public getProjects = async (req: any, res: Response) => {
    const { id } = req?.user;
    try {
      const response = await this.authService.getProjects(id);
      return res.json(response);
    } catch (err: any) {
      return res.json({
        status: false,
        message: err,
      });
    }
  };
}

export const UserController = new User();
