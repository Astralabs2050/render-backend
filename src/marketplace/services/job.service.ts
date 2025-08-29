import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { Job, JobStatus } from '../entities/job.entity';
import { JobApplication, ApplicationStatus } from '../entities/job-application.entity';
import { User, UserType } from '../../users/entities/user.entity';
import { CreateJobDto, UpdateJobDto, JobApplicationDto, JobFilterDto } from '../dto/job.dto';
import { NotificationService } from './notification.service';
@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(JobApplication)
    private applicationRepository: Repository<JobApplication>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationService: NotificationService,
  ) {}
  async createJob(createJobDto: CreateJobDto, creatorId: string): Promise<Job> {
    const creator = await this.userRepository.findOne({ 
      where: { id: creatorId, userType: UserType.CREATOR } 
    });
    if (!creator) {
      throw new BadRequestException('Only creators can post jobs');
    }
    const job = this.jobRepository.create({
      ...createJobDto,
      creatorId,
      creator,
    });
    const savedJob = await this.jobRepository.save(job);
    await this.notificationService.notifyMakersOfNewJob(savedJob);
    return savedJob;
  }
  async findAllJobs(filters: JobFilterDto): Promise<{ jobs: any[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 10, status, priority, minBudget, maxBudget, tags, search } = filters;
    const queryBuilder = this.jobRepository.createQueryBuilder('job')
      .leftJoinAndSelect('job.creator', 'creator')
      .leftJoinAndSelect('job.maker', 'maker')
      .leftJoin('web3_nft', 'nft', 'nft.id = job.designId')
      .addSelect([
        'nft.id as designId',
        'nft.name as designName',
        'nft.imageUrl as designImage',
        'nft.price as designPrice',
        'nft.quantity as designStock',
        'nft.designLink as designLink',
        'nft.updatedAt as designLastUpdated'
      ]);
    if (status) {
      queryBuilder.andWhere('job.status = :status', { status });
    }
    if (priority) {
      queryBuilder.andWhere('job.priority = :priority', { priority });
    }
    if (minBudget) {
      queryBuilder.andWhere('job.budget >= :minBudget', { minBudget });
    }
    if (maxBudget) {
      queryBuilder.andWhere('job.budget <= :maxBudget', { maxBudget });
    }
    if (tags && tags.length > 0) {
      queryBuilder.andWhere('job.tags && :tags', { tags });
    }
    if (search) {
      queryBuilder.andWhere(
        '(job.title ILIKE :search OR job.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);
    queryBuilder.orderBy('job.createdAt', 'DESC');
    const jobsResult = await queryBuilder.getRawAndEntities();
    const total = await queryBuilder.getCount();
    const totalPages = Math.ceil(total / limit);
    
    // Combine job entities with design information
    const enrichedJobs = jobsResult.entities.map((job, index) => {
      const rawJob = jobsResult.raw[index];
      return {
        ...job,
        // Design information for marketplace cards
        image: rawJob.designImage,
        pay: rawJob.designPrice,
        stock: rawJob.designStock,
        link: rawJob.designLink,
        lastUpdated: rawJob.designLastUpdated,
        designName: rawJob.designName
      };
    });
    
    return { jobs: enrichedJobs, total, page, totalPages };
  }
  async findJobById(id: string): Promise<Job> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['creator', 'maker'],
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }
  async updateJob(id: string, updateJobDto: UpdateJobDto, userId: string): Promise<Job> {
    const job = await this.findJobById(id);
    if (job.creatorId !== userId) {
      throw new ForbiddenException('Only the job creator can update this job');
    }
    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException('Cannot update job that is not open');
    }
    Object.assign(job, updateJobDto);
    return this.jobRepository.save(job);
  }
  async deleteJob(id: string, userId: string): Promise<void> {
    const job = await this.findJobById(id);
    if (job.creatorId !== userId) {
      throw new ForbiddenException('Only the job creator can delete this job');
    }
    if (job.status === JobStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete job that is in progress');
    }
    await this.jobRepository.remove(job);
  }
  async applyToJob(jobId: string, applicationDto: JobApplicationDto, makerId: string): Promise<JobApplication> {
    const job = await this.findJobById(jobId);
    const maker = await this.userRepository.findOne({ 
      where: { id: makerId, userType: UserType.MAKER } 
    });
    if (!maker) {
      throw new BadRequestException('Only makers can apply to jobs');
    }
    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException('Job is not open for applications');
    }
    if (job.creatorId === makerId) {
      throw new BadRequestException('Cannot apply to your own job');
    }
    const existingApplication = await this.applicationRepository.findOne({
      where: { jobId, makerId }
    });
    if (existingApplication) {
      throw new BadRequestException('You have already applied to this job');
    }
    const application = this.applicationRepository.create({
      ...applicationDto,
      jobId,
      makerId,
      job,
      maker,
    });
    const savedApplication = await this.applicationRepository.save(application);
    await this.notificationService.notifyCreatorOfApplication(savedApplication);
    return savedApplication;
  }
  async getJobApplications(jobId: string, creatorId: string): Promise<JobApplication[]> {
    const job = await this.findJobById(jobId);
    if (job.creatorId !== creatorId) {
      throw new ForbiddenException('Only the job creator can view applications');
    }
    return this.applicationRepository.find({
      where: { jobId },
      relations: ['maker'],
      order: { createdAt: 'DESC' },
    });
  }
  async acceptApplication(applicationId: string, creatorId: string): Promise<Job> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['job', 'maker'],
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    if (application.job.creatorId !== creatorId) {
      throw new ForbiddenException('Only the job creator can accept applications');
    }
    if (application.job.status !== JobStatus.OPEN) {
      throw new BadRequestException('Job is not open for applications');
    }
    application.status = ApplicationStatus.ACCEPTED;
    application.respondedAt = new Date();
    await this.applicationRepository.save(application);
    application.job.status = JobStatus.IN_PROGRESS;
    application.job.makerId = application.makerId;
    application.job.maker = application.maker;
    application.job.acceptedAt = new Date();
    await this.applicationRepository.update(
      { jobId: application.jobId, id: { $ne: applicationId } as any },
      { status: ApplicationStatus.REJECTED, respondedAt: new Date() }
    );
    const updatedJob = await this.jobRepository.save(application.job);
    await this.notificationService.notifyMakerOfAcceptance(application);
    return updatedJob;
  }
  async completeJob(jobId: string, userId: string, deliverables: string[]): Promise<Job> {
    const job = await this.findJobById(jobId);
    if (job.makerId !== userId) {
      throw new ForbiddenException('Only the assigned maker can complete this job');
    }
    if (job.status !== JobStatus.IN_PROGRESS) {
      throw new BadRequestException('Job is not in progress');
    }
    job.status = JobStatus.COMPLETED;
    job.deliverables = deliverables;
    job.completedAt = new Date();
    const completedJob = await this.jobRepository.save(job);
    await this.notificationService.notifyCreatorOfCompletion(completedJob);
    return completedJob;
  }
  async getMyJobs(userId: string, userType: UserType): Promise<Job[]> {
    const whereCondition = userType === UserType.CREATOR 
      ? { creatorId: userId }
      : { makerId: userId };
    return this.jobRepository.find({
      where: whereCondition,
      relations: ['creator', 'maker'],
      order: { createdAt: 'DESC' },
    });
  }
  async getMyApplications(makerId: string): Promise<JobApplication[]> {
    return this.applicationRepository.find({
      where: { makerId },
      relations: ['job', 'job.creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async getListedJobs(): Promise<any[]> {
    const jobs = await this.jobRepository.find({
      where: { status: JobStatus.OPEN },
      relations: ['creator'],
      order: { updatedAt: 'DESC' },
    });

    if (!jobs.length) {
      return [];
    }

    return jobs.map(job => ({
      id: job.id,
      approvedDesignImage: job.referenceImages?.[0] || null,
      lastUpdatedDay: Math.max(0, Math.floor((Date.now() - job.updatedAt.getTime()) / (1000 * 60 * 60 * 24))),
      nameOfDesign: job.title || 'Untitled Design',
      price: job.budget || 0,
      amountOfDesignsToMade: 1
    }));
  }

  async getJobDetails(id: string): Promise<any> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException('Job is no longer available');
    }

    return {
      jobDescription: job.description || 'No description provided',
      aboutClient: {
        name: job.creator?.fullName || 'Anonymous',
        location: job.creator?.location || 'Not specified',
        memberSince: job.creator?.createdAt || job.createdAt
      },
      datePosted: job.createdAt,
      proposedDueDate: job.deadline || null,
      piecesAvailableInLook: job.referenceImages || []
    };
  }

  async getMakerProjects(makerId: string): Promise<any[]> {
    const maker = await this.userRepository.findOne({
      where: { id: makerId, userType: UserType.MAKER }
    });

    if (!maker) {
      throw new NotFoundException('Maker not found');
    }

    return (maker.projects || []).map((project, index) => ({
      id: `${makerId}-project-${index}`,
      title: project.title,
      images: project.images || [],
      description: project.description,
      tags: project.tags || []
    }));
  }

  async applyWithProjects(jobId: string, dto: { selectedProjects: string[]; portfolioLink?: string; coverLetter?: string }, makerId: string): Promise<JobApplication> {
    const job = await this.findJobById(jobId);
    const maker = await this.userRepository.findOne({ 
      where: { id: makerId, userType: UserType.MAKER } 
    });

    if (!maker) {
      throw new BadRequestException('Only makers can apply to jobs');
    }

    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException('Job is not open for applications');
    }

    if (job.creatorId === makerId) {
      throw new BadRequestException('Cannot apply to your own job');
    }

    const existingApplication = await this.applicationRepository.findOne({
      where: { jobId, makerId }
    });

    if (existingApplication) {
      throw new BadRequestException('You have already applied to this job');
    }

    const selectedProjectDetails = (maker.projects || [])
      .map((project, index) => ({ ...project, id: `${makerId}-project-${index}` }))
      .filter(project => dto.selectedProjects.includes(project.id));

    const application = this.applicationRepository.create({
      jobId,
      makerId,
      job,
      maker,
      coverLetter: dto.coverLetter || '',
      proposedBudget: job.budget,
      proposedTimeline: job.deadline ? Math.ceil((job.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 7,
      portfolioUrl: dto.portfolioLink,
      selectedProjects: selectedProjectDetails
    });

    const savedApplication = await this.applicationRepository.save(application);
    await this.notificationService.notifyCreatorOfApplication(savedApplication);
    return savedApplication;
  }

  async getMakerJobs(makerId: string, filter?: string): Promise<any[]> {
    const applications = await this.applicationRepository.find({
      where: { makerId },
      relations: ['job', 'job.creator'],
      order: { createdAt: 'DESC' }
    });

    const assignedJobs = await this.jobRepository.find({
      where: { makerId },
      relations: ['creator'],
      order: { createdAt: 'DESC' }
    });

    if (filter === 'completed') {
      const withdrawnApps = applications.filter(app => app.status === ApplicationStatus.WITHDRAWN);
      const completedJobs = assignedJobs.filter(job => job.status === JobStatus.COMPLETED);
      return [
        ...withdrawnApps.map(app => ({
          id: app.job.id,
          brandName: app.job.creator?.brandName || app.job.creator?.fullName || 'Unknown',
          jobDescription: app.job.description,
          dateTimeApplied: app.createdAt,
          status: 'withdrawn'
        })),
        ...completedJobs.map(job => ({
          id: job.id,
          brandName: job.creator?.brandName || job.creator?.fullName || 'Unknown',
          jobDescription: job.description,
          dateTimeApplied: job.acceptedAt,
          status: 'completed'
        }))
      ];
    }

    if (filter === 'ongoing') {
      const ongoingJobs = assignedJobs.filter(job => job.status === JobStatus.IN_PROGRESS);
      return ongoingJobs.map(job => ({
        id: job.id,
        brandName: job.creator?.brandName || job.creator?.fullName || 'Unknown',
        jobDescription: job.description,
        dateTimeApplied: job.acceptedAt,
        dueDate: job.deadline
      }));
    }

    if (filter === 'applications') {
      return applications.map(app => {
        let status = 'awaiting decision';
        if (app.status === ApplicationStatus.ACCEPTED) status = 'selected by creator';
        if (app.status === ApplicationStatus.REJECTED) status = 'not selected by creator';
        if (app.status === ApplicationStatus.WITHDRAWN) status = 'withdrawn';

        return {
          id: app.job.id,
          brandName: app.job.creator?.brandName || app.job.creator?.fullName || 'Unknown',
          jobDescription: app.job.description,
          dateTimeApplied: app.createdAt,
          status
        };
      });
    }

    const allJobs = [...applications.map(app => ({ ...app.job, appliedAt: app.createdAt })), ...assignedJobs];
    const uniqueJobs = allJobs.filter((job, index, self) => index === self.findIndex(j => j.id === job.id));
    
    return uniqueJobs.map(job => ({
      id: job.id,
      brandName: job.creator?.brandName || job.creator?.fullName || 'Unknown',
      jobDescription: job.description,
      dateTimeApplied: (job as any).appliedAt || job.acceptedAt,
      status: job.status
    }));
  }


}