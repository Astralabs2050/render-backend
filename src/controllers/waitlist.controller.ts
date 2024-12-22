import { Request, Response } from "express";
import { Waitlist } from "../model/waitlist.model";

class waitlistController {
  public joinWaitlist = async (req: Request, res: Response) => {
    try {
      // Check if the email already exists
      const existingWaitlistEntry = await Waitlist.findOne({
        where: { email: req.body.email },
      });
      if (existingWaitlistEntry) {
        return res.status(400).json({
          message: "Email is already on the waitlist",
          status: false,
        });
      }

      // Create the new waitlist entry
      const waitlist = await Waitlist.create(req.body);
      return res.json({
        message: "Added to waitlist",
        status: true,
      });
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };
}

const WaitlistController = new waitlistController();
export default WaitlistController;
