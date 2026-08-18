import { Controller, Get, Post, UseGuards, Req, Body, Inject, forwardRef, Param, ParseUUIDPipe, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DesignService } from '../services/design.service';
import { JobService } from '../../marketplace/services/job.service';
import { HireMakerDto } from '../dto/hire-maker.dto';
import { PublishMarketplaceDto } from '../dto/publish-marketplace.dto';
import { JobPriority } from '../../marketplace/entities/job.entity';
import { DesignRecordService } from '../../designs/services/design-record.service';
import { DesignStatus } from '../../designs/entities/design-record.entity';

@Controller('creator')
@UseGuards(JwtAuthGuard)
export class CreatorController {
  constructor(
    private readonly designService: DesignService,
    @Inject(forwardRef(() => JobService))
    private readonly jobService: JobService,
    private readonly designRecordService: DesignRecordService,
  ) { }

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

  @Get('inventory/:id')
  async getInventoryById(
    @Param('id', ParseUUIDPipe) designId: string,
    @Req() req
  ) {
    const design = await this.designService.getInventoryById(designId, req.user.id);

    if (!design) {
      throw new NotFoundException('Design not found');
    }

    return {
      status: true,
      message: 'Design retrieved successfully',
      data: design,
    };
  }

  @Post('hire-maker')
  async hireMaker(@Body() hireMakerDto: HireMakerDto, @Req() req) {
    const design = await this.designService.getDesignById(hireMakerDto.designId);
    if (!design || design.creatorId !== req.user.id) {
      throw new Error('Design not found or does not belong to you');
    }

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
      designId: design.id,
      chatId: null,
    };

    const job = await this.jobService.createJob(createJobDto, req.user.id);

    await this.designRecordService.update(design.id, {
      status: DesignStatus.HIRED
    });

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

  @Post('publish-marketplace')
  async publishToMarketplace(@Body() publishDto: PublishMarketplaceDto, @Req() req) {
    const design = await this.designService.getDesignById(publishDto.designId);
    if (!design || design.creatorId !== req.user.id) {
      throw new NotFoundException('Design not found or does not belong to you');
    }

    if (design.status === DesignStatus.DRAFT || design.status === DesignStatus.SAVING) {
      await this.designRecordService.publish(design.id);
    }

    const listedNFT = await this.designRecordService.update(design.id, {
      price: publishDto.pricePerOutfit,
      quantity: publishDto.quantityAvailable,
      status: DesignStatus.LISTED,
      metadata: {
        ...design.metadata,
        deliveryWindow: publishDto.deliveryWindow,
        brandStory: publishDto.brandStory,
        regionOfDelivery: publishDto.regionOfDelivery,
        marketplaceListedAt: new Date().toISOString()
      }
    });

    return {
      status: true,
      message: 'Design published to marketplace successfully',
      data: {
        designId: listedNFT.id,
        name: listedNFT.name,
        status: listedNFT.status,
        price: listedNFT.price,
        quantity: listedNFT.quantity,
        deliveryWindow: publishDto.deliveryWindow,
        brandStory: publishDto.brandStory,
        regionOfDelivery: publishDto.regionOfDelivery,
        imageUrl: listedNFT.imageUrl,
        message: 'Your design is now live on the marketplace and available for purchase.'
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
