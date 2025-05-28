import { Request, Response } from "express";
import { Waitlist } from "../model/waitlist.model";
import sendEmail from "../../util/sendMail";

class WaitlistController {
  public joinWaitlist = async (
    req: Request,
    res: Response,
  ): Promise<Response> => {
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
      await Waitlist.create(req.body);
     await sendEmail(
  req.body.email,
  "You’re on the waitlist – we’ll be in touch soon!",
  `Hi there,

Thanks for joining the waitlist! We're excited to have you on board.

Keep an eye on your inbox — we’ll notify you as soon as it’s your turn.

Best regards,  
Astra`
);

      return res.status(201).json({
        message: "Added to waitlist",
        status: true,
      });
    } catch (error: any) {
      return res.status(500).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };
}

export default new WaitlistController();
