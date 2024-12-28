import { JobApplicationModel, JobModel } from "../model";
import { timelineStatus } from "../model/job.model";

export class AnalyticsService {
    public getAnalytics = async (userId: string) => {
        try {
          // Total jobs created by the user
          const totalJobsCreated = await JobModel.count({
            where: { userId },
          });
      
          // Total job applications related to the user's jobs
          const totalJobApplications = await JobApplicationModel.count({
            where: {
              '$job.userId$': userId,
            },
            include: [
              {
                model: JobModel,
                as: 'job',
              },
            ],
          });
      
          // Total amount from completed job applications
          const jobApplications = await JobApplicationModel.findAll({
            where: {
              '$job.userId$': userId,
              '$job.timelineStatus$': timelineStatus.completed, // Only include completed jobs
            },
            include: [
              {
                model: JobModel,
                as: 'job',
              },
            ],
          });
          const totalAmount = jobApplications.reduce(
            (sum, application) => sum + (application.amount || 0),
            0
          );
      
          // All jobs with completed timelineStatus
          const completedJobs = await JobModel.count({
            where: {
              timelineStatus: timelineStatus.completed,
              userId,
            },
          });
      
          // Total impressions from all jobs
          const jobs = await JobModel.findAll({
            where: { userId },
          });
          const totalImpressions = jobs.reduce(
            (sum, job) => sum + (job.impression || 0),
            0
          );
      
          return {
            message: 'Analytics fetched successfully',
            status: true,
            data: {
              totalJobsCreated,
              totalJobApplications,
              totalAmount,
              completedJobs,
              totalImpressions,
            },
          };
        } catch (err: any) {
          return {
            message: err?.message || 'An error occurred while getting analytics',
            status: false,
          };
        }
      };
      
}