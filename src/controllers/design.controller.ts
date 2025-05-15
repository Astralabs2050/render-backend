import { Request, Response } from "express";
import DesignService from "../service/design.service";

class designController {
  public createNewDesign = async (req: Request, res: Response) => {
    try {
      console.log("reaching the controller");
      const { id } = (req as any)?.user;
      const response = await DesignService.generateNewDesign(req.body, id);
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public getUserCollection =  async(req:Request, res: Response)=>{
    try{
       const { id } = (req as any)?.user;
        const response = await DesignService.getUserCollection(id)
        return res.json(response) 
    }catch(error:any){
       return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  }

  public uploadNewDesign = async (req: Request, res: Response) => {
    try {
      const { id } = (req as any)?.user;
      const response = await DesignService.uploadNewDesign(req.body, id);
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public addCreatorToDesign = async (req: Request, res: Response) => {
    try {
      const { creator, designId } = req.body;
      const response = await DesignService.addCreatorToDesign(
        designId,
        creator,
      );
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public additionalInfromation = async (req: Request, res: Response) => {
    try {
      const { designId } = req.body;
      const response = await DesignService.additionalInformation(
        designId,
        req.body?.data,
      );
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public designAgent = async (req:Request,res:Response)=>{
    try{
      const {message} = req.body;
      const { id } = (req as any)?.user;
      const response = await DesignService.designAgent(message,id, req.body?.id);
      return res.json(response);
    }catch(error:any){
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  }
}

const DesignController = new designController();
export default DesignController;
