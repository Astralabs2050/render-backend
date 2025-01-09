import { Router } from "express";
import isAuthenticated from "../middleware/authorization";
import JobController from "../controllers/job.controller";

const jobRouter = Router();

jobRouter.post(
  "/create-job",
  isAuthenticated as any,
  JobController.createJob as any,
);
jobRouter.get("/get-job", isAuthenticated as any, JobController.getJob as any);
jobRouter.get(
  "/get-all-job",
  isAuthenticated as any,
  JobController.getAllJobs as any,
);
jobRouter.get(
  "/get-job/:id",
  isAuthenticated as any,
  JobController.getEachJob as any,
);
jobRouter.post(
  "/apply-job",
  isAuthenticated as any,
  JobController.applyJob as any,
);
jobRouter.post(
  "/save-job",
  isAuthenticated as any,
  JobController.saveJob as any,
);
jobRouter.get(
  "/save-job",
  isAuthenticated as any,
  JobController.getSaveJob as any,
);
jobRouter.patch(
  "/update-job",
  isAuthenticated as any,
  JobController.updateJob as any,
);

jobRouter.post(
  "/generate-job-desc",
  isAuthenticated as any,
  JobController.getJobDescWithAi as any,
);
jobRouter.get("/makers-job", isAuthenticated as any);
jobRouter.patch(
  "/appcept-reject-job",
  isAuthenticated as any,
  JobController.acceptDeclineJob as any,
);
jobRouter.get(
  "/job-application",
  isAuthenticated as any,
  JobController.getJobApplicants as any,
);

jobRouter.get(
  "/job-application/:id",
  isAuthenticated as any,
  JobController.getOneJobApplicants as any,
);

jobRouter.get(
  "/ongoing-job-application",
  isAuthenticated as any,
  JobController.getOngoingJobs as any,
);
export default jobRouter;
