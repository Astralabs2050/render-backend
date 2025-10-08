import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In } from 'typeorm';
import { Job, JobStatus } from '../entities/job.entity';
import { JobApplication, ApplicationStatus } from '../entities/job-application.entity';
import { SavedJob } from '../entities/saved-job.entity';
import { User, UserType } from '../../users/entities/user.entity';
import { CreateJobDto, UpdateJobDto, JobFilterDto } from '../dto/job.dto';
import { JobApplicationDto } from '../dto/job-application.dto';
import { NotificationService } from './notification.service';
import { ChatService } from './chat.service';
import { NFT } from '../../web3/entities/nft.entity';
import { CloudinaryService } from '../../common/services/cloudinary.service';
@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(JobApplication)
    private applicationRepository: Repository<JobApplication>,
    @InjectRepository(SavedJob)
    private savedJobRepository: Repository<SavedJob>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(NFT)
    private nftRepository: Repository<NFT>,
    private notificationService: NotificationService,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
    private cloudinaryService: CloudinaryService,
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
    const { page = 1, limit = 10, status, priority, minBudget, maxBudget, tags, search, format } = filters;
    const queryBuilder = this.jobRepository.createQueryBuilder('job')
      .leftJoinAndSelect('job.creator', 'creator')
      .leftJoinAndSelect('job.maker', 'maker')
      .leftJoin('nfts', 'nft', 'nft.id = job.designId')
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
    // Optional listed format for marketplace cards
    if (format === 'listed') {
      const openOnly = enrichedJobs.filter(j => j.status === JobStatus.OPEN);
      const listed = openOnly.map(j => ({
        id: j.id,
        approvedDesignImage: j.image || j.referenceImages?.[0] || null,
        lastUpdatedDay: j.lastUpdated ? Math.max(0, Math.floor((Date.now() - new Date(j.lastUpdated).getTime()) / (1000 * 60 * 60 * 24))) : 0,
        nameOfDesign: j.title || j.designName || 'Untitled Design',
        price: j.pay ?? j.budget ?? 0,
        amountOfDesignsToMade: j.stock ?? 1
      }));
      return { jobs: listed, total: listed.length, page, totalPages };
    }

    return { jobs: enrichedJobs, total, page, totalPages };
  }

  async getJobWithClientInfo(jobId: string): Promise<any> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['creator'],
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Get AI chat messages to extract prompt
    let aiPrompt = null;
    if (job.chatId) {
      const messages = await this.jobRepository.manager.query(
        'SELECT content FROM ai_chat_messages WHERE chat_id = $1 AND role = $2 ORDER BY created_at LIMIT 5',
        [job.chatId, 'user']
      );
      if (messages.length > 0) {
        aiPrompt = messages.map(m => m.content).join(' ').substring(0, 200) + '...';
      }
    }

    return {
      ...job,
      aiPrompt: aiPrompt || job.aiPrompt,
      client: {
        id: job.creator.id,
        name: job.creator.fullName || job.creator.brandName,
        profilePicture: job.creator.profilePicture,
        bio: job.creator.bio,
        datePosted: job.createdAt,
        dueDate: job.deadline
      }
    };
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
      portfolioLinks: applicationDto.portfolioLinks,
      proposedBudget: applicationDto.proposedAmount,
      proposedTimeline: applicationDto.minimumNegotiableAmount,
      selectedProjects: applicationDto.selectedProjects || [],
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
    await this.chatService.createChat(application.jobId, application.job.creatorId, application.makerId);
    await this.notificationService.notifyMakerOfAcceptance(application);
    return updatedJob;
  }

  async declineApplication(applicationId: string, creatorId: string): Promise<JobApplication> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['job', 'maker'],
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    if (application.job.creatorId !== creatorId) {
      throw new ForbiddenException('Only the job creator can decline applications');
    }
    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Application is no longer pending');
    }
    application.status = ApplicationStatus.REJECTED;
    application.respondedAt = new Date();
    const updatedApplication = await this.applicationRepository.save(application);
    // Notify the maker if notification service has this method
    // await this.notificationService.notifyMakerOfRejection(application);
    return updatedApplication;
  }

  async getCreatorApplications(creatorId: string): Promise<any[]> {
    // Get all jobs for this creator
    const jobs = await this.jobRepository.find({
      where: { creatorId },
      relations: ['creator', 'maker'],
    });

    if (!jobs.length) {
      return [];
    }

    const jobIds = jobs.map(job => job.id);

    // Get all applications for these jobs
    const applications = await this.applicationRepository.find({
      where: { jobId: In(jobIds) },
      relations: ['job', 'maker'],
      order: { createdAt: 'DESC' },
    });

    // Format the response with maker info, amount, and timeline
    return applications.map(app => ({
      id: app.id,
      jobId: app.jobId,
      jobTitle: app.job.title,
      jobBudget: app.job.budget,
      jobStatus: app.job.status,
      jobDeadline: app.job.deadline,
      maker: {
        id: app.maker.id,
        fullName: app.maker.fullName,
        email: app.maker.email,
        profilePicture: app.maker.profilePicture,
        bio: app.maker.bio,
        skills: app.maker.skills,
        brandName: app.maker.brandName,
        location: app.maker.location,
      },
      proposedBudget: app.proposedBudget,
      estimatedDays: app.estimatedDays,
      proposedTimeline: app.proposedTimeline,
      proposal: app.proposal,
      coverLetter: app.coverLetter,
      portfolioUrl: app.portfolioUrl,
      selectedProjects: app.selectedProjects,
      status: app.status,
      createdAt: app.createdAt,
      respondedAt: app.respondedAt,
    }));
  }

  async getCreatorJobsWithApplications(creatorId: string): Promise<any[]> {
    // Get all jobs for this creator with maker relation
    const jobs = await this.jobRepository.find({
      where: { creatorId },
      relations: ['creator', 'maker'],
      order: { createdAt: 'DESC' },
    });

    if (!jobs.length) {
      return [];
    }

    // Get applications for all jobs
    const jobIds = jobs.map(job => job.id);
    const applications = await this.applicationRepository.find({
      where: { jobId: In(jobIds) },
      relations: ['maker'],
      order: { createdAt: 'DESC' },
    });

    // Group applications by jobId
    const applicationsByJob = applications.reduce((acc, app) => {
      if (!acc[app.jobId]) {
        acc[app.jobId] = [];
      }
      acc[app.jobId].push({
        id: app.id,
        maker: {
          id: app.maker.id,
          fullName: app.maker.fullName,
          email: app.maker.email,
          profilePicture: app.maker.profilePicture,
          bio: app.maker.bio,
          skills: app.maker.skills,
          brandName: app.maker.brandName,
          location: app.maker.location,
        },
        proposedBudget: app.proposedBudget,
        estimatedDays: app.estimatedDays,
        proposedTimeline: app.proposedTimeline,
        proposal: app.proposal,
        coverLetter: app.coverLetter,
        portfolioUrl: app.portfolioUrl,
        selectedProjects: app.selectedProjects,
        status: app.status,
        createdAt: app.createdAt,
        respondedAt: app.respondedAt,
      });
      return acc;
    }, {});

    // Format response with jobs and their applications
    return jobs.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      budget: job.budget,
      currency: job.currency,
      status: job.status,
      priority: job.priority,
      deadline: job.deadline,
      tags: job.tags,
      referenceImages: job.referenceImages,
      designId: job.designId,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      acceptedAt: job.acceptedAt,
      completedAt: job.completedAt,
      hiredMaker: job.maker ? {
        id: job.maker.id,
        fullName: job.maker.fullName,
        email: job.maker.email,
        profilePicture: job.maker.profilePicture,
        bio: job.maker.bio,
        skills: job.maker.skills,
        brandName: job.maker.brandName,
        location: job.maker.location,
      } : null,
      applications: applicationsByJob[job.id] || [],
      applicationsCount: (applicationsByJob[job.id] || []).length,
      pendingApplicationsCount: (applicationsByJob[job.id] || []).filter((a: any) => a.status === ApplicationStatus.PENDING).length,
      acceptedApplicationsCount: (applicationsByJob[job.id] || []).filter((a: any) => a.status === ApplicationStatus.ACCEPTED).length,
    }));
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
    // Get jobs the maker has applied to
    const applications = await this.applicationRepository.find({
      where: { makerId },
      relations: ['job', 'job.creator'],
      order: { createdAt: 'DESC' }
    });

    // Get jobs the maker is assigned to
    const assignedJobs = await this.jobRepository.find({
      where: { makerId },
      relations: ['creator'],
      order: { createdAt: 'DESC' }
    });

    // Get all available open jobs from creators (not applied to yet)
    const appliedJobIds = applications.map(app => app.jobId);
    const assignedJobIds = assignedJobs.map(job => job.id);
    const excludedJobIds = [...appliedJobIds, ...assignedJobIds];

    const availableJobs = await this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.creator', 'creator')
      .where('job.status = :status', { status: JobStatus.OPEN })
      .andWhere('job.creatorId != :makerId', { makerId }) // Don't show maker's own jobs
      .andWhere(excludedJobIds.length > 0 ? 'job.id NOT IN (:...excludedJobIds)' : '1=1', { excludedJobIds })
      .orderBy('job.createdAt', 'DESC')
      .getMany();

    // Collect all designIds and batch-load NFTs to avoid N+1 queries
    const designIdsSet = new Set<string>();
    applications.forEach(app => { if (app.job?.designId) designIdsSet.add(app.job.designId); });
    assignedJobs.forEach(job => { if (job.designId) designIdsSet.add(job.designId); });
    availableJobs.forEach(job => { if (job.designId) designIdsSet.add(job.designId); });
    const designIds = Array.from(designIdsSet);
    const nfts = designIds.length
      ? await this.nftRepository.find({ where: { id: In(designIds) } })
      : [];
    const nftById = new Map(nfts.map(n => [n.id, n] as const));

    const toDesignFields = (job: Job) => {
      const nft = job.designId ? nftById.get(job.designId) : undefined;
      // Prefer permanent image URLs over temporary blob URLs
      const getImageUrl = () => {
        if (nft?.imageUrl && !nft.imageUrl.includes('blob.core.windows.net')) {
          return nft.imageUrl;
        }
        if (nft?.ipfsUrl) {
          return nft.ipfsUrl;
        }
        if (job.referenceImages?.[0] && !job.referenceImages[0].includes('blob.core.windows.net')) {
          return job.referenceImages[0];
        }
        // Fallback to a professional fashion placeholder image
        return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&crop=center&auto=format&q=80';
      };

      return {
        image: getImageUrl(),
        pay: nft?.price ?? job.budget ?? null,
        stock: nft?.quantity ?? 1, // Default to 1 if no NFT quantity
        link: nft?.designLink ?? null,
        lastUpdated: nft?.updatedAt ?? job.updatedAt ?? null,
      };
    };

    if (filter === 'completed') {
      const withdrawnApps = applications.filter(app => app.status === ApplicationStatus.WITHDRAWN);
      const completedJobs = assignedJobs.filter(job => job.status === JobStatus.COMPLETED);
      return [
        ...withdrawnApps.map(app => ({
          id: app.job.id,
          brandName: app.job.creator?.brandName || app.job.creator?.fullName || 'Unknown',
          jobDescription: app.job.description,
          dateTimeApplied: app.createdAt,
          status: 'withdrawn',
          ...toDesignFields(app.job)
        })),
        ...completedJobs.map(job => ({
          id: job.id,
          brandName: job.creator?.brandName || job.creator?.fullName || 'Unknown',
          jobDescription: job.description,
          dateTimeApplied: job.acceptedAt,
          status: 'completed',
          ...toDesignFields(job)
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
        dueDate: job.deadline,
        ...toDesignFields(job)
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
          status,
          ...toDesignFields(app.job)
        };
      });
    }

    if (filter === 'available') {
      // Return all open jobs that the maker hasn't applied to yet
      return availableJobs.map(job => ({
        id: job.id,
        brandName: job.creator?.brandName || job.creator?.fullName || 'Unknown',
        jobDescription: job.description,
        datePosted: job.createdAt,
        deadline: job.deadline,
        budget: job.budget,
        status: 'available',
        ...toDesignFields(job)
      }));
    }

    // Default: return all jobs (applied, assigned, and available)
    const allJobs = [
      ...applications.map(app => ({ ...app.job, appliedAt: app.createdAt, jobSource: 'applied' })),
      ...assignedJobs.map(job => ({ ...job, jobSource: 'assigned' })),
      ...availableJobs.map(job => ({ ...job, jobSource: 'available' }))
    ];
    const uniqueJobs = allJobs.filter((job, index, self) => index === self.findIndex(j => j.id === job.id));

    return uniqueJobs.map(job => ({
      id: job.id,
      brandName: job.creator?.brandName || job.creator?.fullName || 'Unknown',
      jobDescription: job.description,
      dateTimeApplied: (job as any).appliedAt || job.acceptedAt,
      datePosted: job.createdAt,
      deadline: job.deadline,
      budget: job.budget,
      status: job.status,
      ...toDesignFields(job as Job)
    }));
  }

  async applyToJobWithPortfolio(jobId: string, applicationDto: any, makerId: string): Promise<any> {
    const job = await this.findJobById(jobId);
    
    // 1. Verify maker exists
    const maker = await this.userRepository.findOne({
      where: { id: makerId, userType: UserType.MAKER }
    });
    
    if (!maker) {
      throw new BadRequestException('Only makers can apply to jobs');
    }
    
    // 2. Check job status FIRST
    if (job.status !== JobStatus.OPEN) {
      throw new BadRequestException(`Job is not open for applications. Current status: ${job.status}`);
    }
    
    // 3. Check if already applied AFTER status validation
    const existingApplication = await this.jobRepository.manager.query(
      'SELECT id FROM job_applications WHERE job_id = $1 AND maker_id = $2',
      [jobId, makerId]
    );
    
    if (existingApplication.length > 0) {
      throw new BadRequestException('You have already applied to this job');
    }
    
    // Create application with portfolio info
    const application = await this.jobRepository.manager.query(
      `INSERT INTO job_applications (job_id, maker_id, "portfolioLinks", "selectedProjects", "proposedBudget", "proposedTimeline", status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
       RETURNING *`,
      [
        jobId,
        makerId,
        JSON.stringify(applicationDto.portfolioLinks || []),
        JSON.stringify(applicationDto.selectedProjects || []),
        applicationDto.proposedAmount || 0,
        applicationDto.timeline || 7
      ]
    );
    
    return {
      message: 'Application submitted successfully',
      applicationId: application[0].id,
      proposedAmount: applicationDto.proposedAmount,
      minimumNegotiableAmount: applicationDto.minimumNegotiableAmount
    };
  }

  async saveJobForMaker(jobId: string, makerId: string): Promise<any> {
    const job = await this.findJobById(jobId);
    
    // Verify maker exists
    const maker = await this.userRepository.findOne({
      where: { id: makerId, userType: UserType.MAKER }
    });
    
    if (!maker) {
      throw new BadRequestException('Only makers can save jobs');
    }
    
    // Check if already saved using entity repository
    const existingSave = await this.savedJobRepository.findOne({
      where: { jobId, makerId }
    });
    
    if (existingSave) {
      throw new BadRequestException('Job already saved');
    }
    
    // Save job using entity
    const savedJob = this.savedJobRepository.create({
      jobId,
      makerId
    });
    await this.savedJobRepository.save(savedJob);
    
    return {
      message: 'Job saved successfully',
      jobId
    };
  }

  async getSavedJobs(makerId: string): Promise<any[]> {
    const savedJobs = await this.savedJobRepository.find({
      where: { makerId },
      relations: ['job', 'job.creator'],
      order: { savedAt: 'DESC' }
    });

    return savedJobs.map(savedJob => ({
      id: savedJob.job.id,
      title: savedJob.job.title,
      description: savedJob.job.description,
      budget: savedJob.job.budget,
      deadline: savedJob.job.deadline,
      status: savedJob.job.status,
      aiPrompt: savedJob.job.aiPrompt,
      client: {
        name: savedJob.job.creator.fullName || savedJob.job.creator.brandName,
        profilePicture: savedJob.job.creator.profilePicture
      },
      datePosted: savedJob.job.createdAt,
      dateSaved: savedJob.savedAt
    }));
  }

  async getMakerApplicationProfile(applicationId: string, creatorId: string): Promise<any> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
      relations: ['job', 'job.creator', 'maker'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.job.creatorId !== creatorId) {
      throw new ForbiddenException('Only the job creator can view this application');
    }

    const maker = application.maker;

    // Calculate years of experience from work experience
    let yearsOfExperience = 0;
    if (maker.workExperience && maker.workExperience.length > 0) {
      const experiences = maker.workExperience.map(exp => {
        const startYear = parseInt(exp.startYear);
        const endYear = exp.endYear ? parseInt(exp.endYear) : new Date().getFullYear();
        return endYear - startYear;
      });
      yearsOfExperience = Math.max(...experiences);
    }

    return {
      applicationId: application.id,
      applicationStatus: application.status,
      appliedAt: application.createdAt,
      maker: {
        id: maker.id,
        fullName: maker.fullName,
        email: maker.email,
        profilePicture: maker.profilePicture,
        bio: maker.bio,
        location: maker.location,
        skills: maker.skills || [],
        brandName: maker.brandName,
        brandStory: maker.brandStory,
        brandLogo: maker.brandLogo,
        yearsOfExperience,
      },
      application: {
        proposedAmount: application.proposedBudget,
        proposedTimeline: application.proposedTimeline,
        coverLetter: application.coverLetter,
        portfolioUrl: application.portfolioUrl,
        portfolioLinks: application.portfolioLinks || [],
        selectedProjects: application.selectedProjects || [],
      },
      verification: {
        identityVerified: maker.identityVerified,
        businessCertificate: maker.businessCertificateImage,
        businessName: maker.businessName,
        businessType: maker.businessType,
      },
      workExperience: maker.workExperience || [],
      projects: maker.projects || [],
    };
  }

  async uploadDesignForMinting(file: Express.Multer.File, description: string, userId: string): Promise<any> {
    // Verify user exists and is a creator
    const user = await this.userRepository.findOne({
      where: { id: userId, userType: UserType.CREATOR }
    });

    if (!user) {
      throw new BadRequestException('Only creators can upload designs');
    }

    let uploadResult;
    let savedNFT;

    try {
      // Upload image to Cloudinary
      uploadResult = await this.cloudinaryService.uploadDesignImage(
        file.buffer,
        `upload_${Date.now()}`,
        userId
      );

      if (!uploadResult || !uploadResult.secure_url) {
        throw new BadRequestException('Failed to upload image to cloud storage');
      }

    } catch (error) {
      const errorMessage = error.message || 'Image upload failed';
      throw new BadRequestException(`Upload failed: ${errorMessage}`);
    }

    try {
      // Create NFT record for minting preparation
      const nft = this.nftRepository.create({
        name: description.substring(0, 100) || 'Untitled Design', // Use first 100 chars of description as name
        description,
        category: 'fashion',
        price: 0,
        quantity: 1,
        imageUrl: uploadResult.secure_url,
        creatorId: userId,
        status: 'draft' as any,
      });

      savedNFT = await this.nftRepository.save(nft);

    } catch (error) {
      // Cleanup: Delete uploaded image from Cloudinary if DB save fails
      try {
        if (uploadResult?.public_id) {
          await this.cloudinaryService.deleteImage(uploadResult.public_id);
        }
      } catch (cleanupError) {
        // Log cleanup error but don't throw
        console.error('Failed to cleanup uploaded image:', cleanupError);
      }

      throw new BadRequestException('Failed to save design record. Please try again.');
    }

    return {
      status: true,
      message: 'Design uploaded successfully. You can now proceed to mint.',
      data: {
        designId: savedNFT.id,
        imageUrl: uploadResult.secure_url,
        description,
        variants: this.cloudinaryService.getImageVariants(uploadResult.public_id),
        nextStep: 'Use the /web3/nft/mint endpoint to mint this design',
      }
    };
  }

}