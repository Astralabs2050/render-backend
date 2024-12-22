import { Request, Response } from "express";

class measurementController {
  public uploadMeasurement = async (req: Request, res: Response) => {
    try {
      const { id } = (req as any)?.user;
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };
}

const MeasurementController = new measurementController();
export default MeasurementController;
