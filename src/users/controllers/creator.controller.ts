import { Controller, Get, Post, UseGuards, Req, Body, Inject, forwardRef } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserType } from '../entities/user.entity';
import { DesignService } from '../services/design.service';
import { JobService } from '../../marketplace/services/job.service';
import { HireMakerDto } from '../dto/hire-maker.dto';
import { JobPriority } from '../../marketplace/entities/job.entity';

@Controller('creator')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(UserType.CREATOR)
export class CreatorController {
  constructor(
    private readonly designService: DesignService,
    @Inject(forwardRef(() => JobService))
    private readonly jobService: JobService,
  ) {}

  @Get('dashboard')
  getCreatorDashboard() {
    return {
      status: true,
      message: 'Creator dashboard data',
      data: {
        stats: {
          designs: 10,
          followers: 250,
          sales: 15
        }
      }
    };
  }

  @Get('inventory')
  async getCreatorInventory(@Req() req) {
    const designs = await this.designService.getCreatorInventory(req.user.id);
    return {
      status: true,
      message: 'Creator inventory retrieved successfully',
      data: designs,
    };
  }

  @Post('hire-maker')
  async hireMaker(@Body() hireMakerDto: HireMakerDto, @Req() req) {
    // Validate that the design belongs to the creator
    const design = await this.designService.getDesignById(hireMakerDto.designId);
    if (!design || design.creatorId !== req.user.id) {
      throw new Error('Design not found or does not belong to you');
    }

    // Check if design needs minting first (if in DRAFT status)
    if (design.status === 'draft') {
      return {
        status: false,
        message: 'Design needs to be minted before hiring a maker',
        data: {
          designId: design.id,
          currentStatus: design.status,
          action: 'mint_required',
          web3Required: true,
          message: 'Please mint your design first, then try hiring a maker again.'
        }
      };
    }

    // Convert HireMakerDto to CreateJobDto format
    const createJobDto = {
      title: `Hire Maker for ${design.name}`,
      description: hireMakerDto.requirements,
      requirements: `Quantity: ${hireMakerDto.quantity}
Deadline: ${hireMakerDto.deadlineDate.toLocaleDateString()}
Timeline: ${hireMakerDto.productTimeline}
Budget Range: $${hireMakerDto.budgetRange.min}-$${hireMakerDto.budgetRange.max}
Shipping: ${hireMakerDto.shippingRegion}
Fabric Source: ${hireMakerDto.fabricSource}
Experience Level: ${hireMakerDto.experienceLevel}
Skills: ${hireMakerDto.skillKeywords.join(', ')}`,
      budget: hireMakerDto.budgetRange.max,
      currency: 'USD',
      priority: this.getPriorityFromDeadline(hireMakerDto.deadlineDate),
      deadline: hireMakerDto.deadlineDate.toISOString(), 
      tags: [
        'maker-hiring',
        'production',
        hireMakerDto.experienceLevel,
        `budget-${hireMakerDto.budgetRange.min}-${hireMakerDto.budgetRange.max}`,
        ...hireMakerDto.skillKeywords
      ],
      referenceImages: [design.imageUrl],
      designId: design.id, // Link to the NFT design
      chatId: null, // Will be created when maker applies
    };

    // Create the job using the existing marketplace system
    const job = await this.jobService.createJob(createJobDto, req.user.id);

    return {
      status: true,
      message: 'Maker hiring request created successfully',
      data: {
        jobId: job.id,
        title: job.title,
        status: job.status,
        budget: job.budget,
        deadline: job.deadline,
        requirements: job.requirements,
        message: 'Your hiring request has been posted to the marketplace. Makers will be able to see and apply for this job.'
      }
    };
  }



  private getPriorityFromDeadline(deadlineDate: Date): JobPriority {
    const now = new Date();
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline <= 7) return JobPriority.URGENT;
    if (daysUntilDeadline <= 14) return JobPriority.HIGH;
    if (daysUntilDeadline <= 30) return JobPriority.MEDIUM;
    return JobPriority.LOW;
  }
}