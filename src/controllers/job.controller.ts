import { Request, Response } from "express";
import JobService from "../service/job.service";
import { timelineStatus } from "../model/job.model";

class jobController {
  public createJob = async (req: Request, res: Response) => {
    try {
      const { id } = (req as any)?.user;
      const response = await JobService.createJob(req.body, id);
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public getJob = async (req: Request, res: Response) => {
    try {
      const { id } = (req as any)?.user;
      const { status } = req.params;
      const response = await JobService.getJob(id, status);
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public saveJob = async (req: Request, res: Response) => {
    try {
      const { id } = (req as any)?.user;
      const { jobId } = req?.body;
      const response = await JobService.saveJob(id, jobId);
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public acceptDeclineJob = async (req: Request, res: Response) => {
    try {
      const { jobApplicationId, status, negotiation = false } = req?.body;
      const response = await JobService.acceptDeclineJobApplication(
        jobApplicationId,
        status,
        negotiation,
      );
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public getSaveJob = async (req: Request, res: Response) => {
    try {
      const { id } = (req as any)?.user;

      const response = await JobService.getSavedJob(id);
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public updateJob = async (req: Request, res: Response) => {
    try {
      const { id } = (req as any)?.user;
      const { jobId, status, escorowId } = (req as any)?.body;
      const response = await JobService.updateJob(jobId, status,escorowId);
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public getEachJob = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const authUser = (req as any)?.user;
      console.log("the job id", id);
      const response = await JobService.getEachJob(id, authUser);
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public applyJob = async (req: Request, res: Response) => {
    try {
      const { id } = (req as any)?.user;
      const response = await JobService.applyForJob(req.body, id);
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public getAllJobs = async (req: Request, res: Response) => {
    try {
      const response = await JobService.getAllJobs();
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public getOngoingJobs = async (req: Request, res: Response) => {
    try {
      const id = req?.query?.id;
      const status = req?.query?.status;
      console.log("status", status, req?.query);
      const response = await JobService.getOngoingJobApplication(
        id as string,
        status as timelineStatus,
      );
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public getJobApplicants = async (req: Request, res: Response) => {
    try {
      const jobId: any = req.query?.jobId;
      console.log("jobId", jobId);
      const response = await JobService.getJobApplicants(jobId);
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public getOneJobApplicants = async (req: Request, res: Response) => {
    try {
      const { id } = (req as any)?.user;
      const jobId: any = req.query?.jobId;
      const userId: any = req.query?.userId;
      const response = await JobService.getOneJobApplicants(jobId, userId);
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };

  public getJobDescWithAi = async (req: Request, res: Response) => {
    try {
      const { design }: any = req.body;
      console.log("req.params", req.body);
      const response = await JobService.generateJobDescWithAi(req.body);
      return res.json(response);
    } catch (error: any) {
      return res.status(400).json({
        status: false,
        message: `An error occurred: ${error?.message || error}`,
      });
    }
  };
}
const JobController = new jobController();
export default JobController;
