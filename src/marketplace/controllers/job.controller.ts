import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Public } from '../../auth/decorators/public.decorator';
import { JobService } from '../services/job.service';
import { WorkflowService, DesignRequirements } from '../services/workflow.service';
import { MarketplaceService } from '../services/marketplace.service';
import { JobApplicationDto } from '../dto/job-application.dto';
import { CreateJobDto, UpdateJobDto, JobFilterDto } from '../dto/job.dto';
import { MarketplaceFilterDto } from '../dto/marketplace-filter.dto';
import { UploadDesignDto } from '../dto/upload-design.dto';
import { UserType } from '../../users/entities/user.entity';
@Controller('marketplace')
@UseGuards(JwtAuthGuard)
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly workflowService: WorkflowService,
    private readonly marketplaceService: MarketplaceService,
  ) {}
  @Post('jobs')
  async createJob(@Body() createJobDto: CreateJobDto, @Request() req) {
    return this.jobService.createJob(createJobDto, req.user.id);
  }
  @Public()
  @Get('jobs')
  async findAllJobs(@Query() filters: JobFilterDto) {
    return this.jobService.findAllJobs(filters);
  }

  @Public()
  @Get('jobs/listed')
  async getListedJobs() {
    return this.jobService.getListedJobs();
  }
  @Public()
  @Get('jobs/:id')
  async findJobById(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobService.findJobById(id);
  }

  @Public()
  @Get('jobs/:id/details')
  async getJobDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobService.getJobDetails(id);
  }

  @Public()
  @Get('jobs/:id')
  async getJobWithClientInfo(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobService.getJobWithClientInfo(id);
  }

  @Get('maker/projects')
  async getMakerProjects(@Request() req) {
    return this.jobService.getMakerProjects(req.user.id);
  }

  @Post('jobs/:id/apply-with-projects')
  async applyWithProjects(
    @Param('id', ParseUUIDPipe) jobId: string,
    @Body() dto: { selectedProjects: string[]; portfolioLink?: string; coverLetter?: string },
    @Request() req
  ) {
    return this.jobService.applyWithProjects(jobId, dto, req.user.id);
  }
  @Put('jobs/:id')
  async updateJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateJobDto: UpdateJobDto,
    @Request() req
  ) {
    return this.jobService.updateJob(id, updateJobDto, req.user.id);
  }
  @Delete('jobs/:id')
  async deleteJob(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    await this.jobService.deleteJob(id, req.user.id);
    return { message: 'Job deleted successfully' };
  }
  @Post('jobs/:id/apply')
  async applyToJob(
    @Param('id', ParseUUIDPipe) jobId: string,
    @Body() applicationDto: JobApplicationDto,
    @Request() req
  ) {
    return this.jobService.applyToJobWithPortfolio(jobId, applicationDto, req.user.id);
  }

  @Post('jobs/:id/save')
  async saveJob(@Param('id', ParseUUIDPipe) jobId: string, @Request() req) {
    return this.jobService.saveJobForMaker(jobId, req.user.id);
  }

  @Get('maker/saved-jobs')
  async getSavedJobs(@Request() req) {
    return this.jobService.getSavedJobs(req.user.id);
  }
  @Get('jobs/:id/applications')
  async getJobApplications(@Param('id', ParseUUIDPipe) jobId: string, @Request() req) {
    return this.jobService.getJobApplications(jobId, req.user.id);
  }
  @Post('applications/:id/accept')
  async acceptApplication(@Param('id', ParseUUIDPipe) applicationId: string, @Request() req) {
    return this.jobService.acceptApplication(applicationId, req.user.id);
  }

  @Post('applications/:id/decline')
  async declineApplication(@Param('id', ParseUUIDPipe) applicationId: string, @Request() req) {
    return this.jobService.declineApplication(applicationId, req.user.id);
  }

  @Get('creator/applications')
  async getCreatorApplications(@Request() req) {
    if (req.user.userType !== UserType.CREATOR) {
      throw new BadRequestException('Only creators can view applications');
    }
    return this.jobService.getCreatorApplications(req.user.id);
  }

  @Get('creator/jobs-with-applications')
  async getCreatorJobsWithApplications(@Request() req) {
    if (req.user.userType !== UserType.CREATOR) {
      throw new BadRequestException('Only creators can view jobs with applications');
    }
    return this.jobService.getCreatorJobsWithApplications(req.user.id);
  }

  @Get('applications/:id/maker-profile')
  async getMakerApplicationProfile(
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Request() req
  ) {
    return this.jobService.getMakerApplicationProfile(applicationId, req.user.id);
  }
  @Post('jobs/:id/complete')
  async completeJob(
    @Param('id', ParseUUIDPipe) jobId: string,
    @Body('deliverables') deliverables: string[],
    @Request() req
  ) {
    return this.jobService.completeJob(jobId, req.user.id, deliverables);
  }
  @Get('my-jobs')
  async getMyJobs(@Request() req) {
    return this.jobService.getMyJobs(req.user.id, req.user.userType);
  }
  @Get('my-applications')
  async getMyApplications(@Request() req) {
    if (req.user.userType !== UserType.MAKER) {
      throw new BadRequestException('Only makers can view applications');
    }
    return this.jobService.getMyApplications(req.user.id);
  }

  @Get('maker/jobs')
  async getMakerJobs(@Query('filter') filter: string, @Request() req) {
    if (req.user.userType !== UserType.MAKER) {
      throw new BadRequestException('Only makers can access this endpoint');
    }

    const validFilters = ['applications', 'ongoing', 'completed', 'available'];
    if (filter && !validFilters.includes(filter)) {
      throw new BadRequestException(`Invalid filter. Valid options: ${validFilters.join(', ')}`);
    }

    return this.jobService.getMakerJobs(req.user.id, filter);
  }
  @Post('jobs/from-design')
  async createJobFromDesign(@Body() requirements: DesignRequirements, @Request() req) {
    return this.workflowService.createJobFromDesign(requirements, req.user.id);
  }
  @Post('jobs/from-chat/:chatId')
  async createJobFromChat(@Param('chatId', ParseUUIDPipe) chatId: string, @Request() req) {
    return this.workflowService.createJobFromChat(chatId, req.user.id);
  }

  @Post('design/upload')
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 uploads per hour
  @UseInterceptors(FileInterceptor('image'))
  async uploadDesignDirectly(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDesignDto: UploadDesignDto,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('Design image is required');
    }

    // Validate file exists and has content
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PNG, JPG, and JPEG images are allowed');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('Image size cannot exceed 10MB');
    }

    // Validate minimum file size (1KB to avoid corrupt files)
    const minSize = 1024; // 1KB
    if (file.size < minSize) {
      throw new BadRequestException('Image file is too small or corrupt');
    }

    // Validate name is not empty or just whitespace
    if (!uploadDesignDto.name || uploadDesignDto.name.trim().length === 0) {
      throw new BadRequestException('Design name cannot be empty');
    }

    // Validate description is not empty or just whitespace
    if (!uploadDesignDto.description || uploadDesignDto.description.trim().length === 0) {
      throw new BadRequestException('Design description cannot be empty');
    }

    return this.jobService.uploadDesignForMinting(
      file,
      uploadDesignDto.name.trim(),
      uploadDesignDto.description.trim(),
      req.user.id
    );
  }
  // NFT Marketplace Endpoints
  @Public()
  @Get('browse')
  async browseMarketplace(@Query() filters: MarketplaceFilterDto) {
    return this.marketplaceService.browseMarketplace(filters);
  }

  @Public()
  @Get('items/:id')
  async getMarketplaceItem(@Param('id', ParseUUIDPipe) id: string) {
    const item = await this.marketplaceService.getMarketplaceItem(id);
    if (!item) {
      throw new BadRequestException('Marketplace item not found');
    }
    return {
      status: true,
      message: 'Marketplace item retrieved successfully',
      data: item,
    };
  }

  @Get('stats')
  async getMarketplaceStats(@Request() req) {
    const myJobs = await this.jobService.getMyJobs(req.user.id, req.user.userType);
    if (req.user.userType === UserType.CREATOR) {
      const openJobs = myJobs.filter(job => job.status === 'open').length;
      const inProgressJobs = myJobs.filter(job => job.status === 'in_progress').length;
      const completedJobs = myJobs.filter(job => job.status === 'completed').length;
      return {
        totalJobs: myJobs.length,
        openJobs,
        inProgressJobs,
        completedJobs,
      };
    } else {
      const applications = await this.jobService.getMyApplications(req.user.id);
      const acceptedApplications = applications.filter(app => app.status === 'accepted').length;
      const pendingApplications = applications.filter(app => app.status === 'pending').length;
      return {
        totalApplications: applications.length,
        acceptedApplications,
        pendingApplications,
        activeJobs: myJobs.length,
      };
    }
  }
}