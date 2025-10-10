import { Controller, Get, Post, UseGuards, Req, Body, Inject, forwardRef, Param, ParseUUIDPipe, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserType } from '../entities/user.entity';
import { DesignService } from '../services/design.service';
import { JobService } from '../../marketplace/services/job.service';
import { HireMakerDto } from '../dto/hire-maker.dto';
import { PublishMarketplaceDto } from '../dto/publish-marketplace.dto';
import { JobPriority } from '../../marketplace/entities/job.entity';
import { NFTService } from '../../web3/services/nft.service';
import { NFTStatus } from '../../web3/entities/nft.entity';

@Controller('creator')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(UserType.CREATOR)
export class CreatorController {
  constructor(
    private readonly designService: DesignService,
    @Inject(forwardRef(() => JobService))
    private readonly jobService: JobService,
    private readonly nftService: NFTService,
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
    // Validate that the design belongs to the creator
    const design = await this.designService.getDesignById(hireMakerDto.designId);
    if (!design || design.creatorId !== req.user.id) {
      throw new Error('Design not found or does not belong to you');
    }

    // Check if design needs minting first (if in PUBLISHED status, needs minting)
    if (design.status === 'published') {
      return {
        status: false,
        message: 'Design needs to be minted to marketplace before hiring a maker',
        data: {
          designId: design.id,
          currentStatus: design.status,
          action: 'mint_required',
          web3Required: true,
          message: 'Please mint your design to the marketplace first, then try hiring a maker again.'
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

    // Update NFT status to HIRED since the creator is actively hiring a maker
    await this.nftService.updateNFT(design.id, {
      status: NFTStatus.HIRED
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
    // Validate that the design belongs to the creator
    const design = await this.designService.getDesignById(publishDto.designId);
    if (!design || design.creatorId !== req.user.id) {
      throw new NotFoundException('Design not found or does not belong to you');
    }

    // Check if design is in the right status for marketplace publishing
    if (design.status !== NFTStatus.MINTED) {
      return {
        status: false,
        message: 'Design must be minted before publishing to marketplace',
        data: {
          designId: design.id,
          currentStatus: design.status,
          action: 'mint_required',
          web3Required: true,
          message: 'Please mint your design first, then try publishing to marketplace again.'
        }
      };
    }

    // Update the NFT with marketplace information
    const updatedNFT = await this.nftService.updateNFT(design.id, {
      price: publishDto.pricePerOutfit,
      quantity: publishDto.quantityAvailable,
      status: NFTStatus.LISTED,
      metadata: {
        ...design.metadata,
        deliveryWindow: publishDto.deliveryWindow,
        brandStory: publishDto.brandStory,
        regionOfDelivery: publishDto.regionOfDelivery,
        marketplaceListedAt: new Date().toISOString()
      }
    });

    // List the NFT on the marketplace
    const listedNFT = await this.nftService.listNFT(design.id);

    return {
      status: true,
      message: 'Design published to marketplace successfully',
      data: {
        nftId: listedNFT.id,
        name: listedNFT.name,
        status: listedNFT.status,
        price: listedNFT.price,
        quantity: listedNFT.quantity,
        deliveryWindow: publishDto.deliveryWindow,
        brandStory: publishDto.brandStory,
        regionOfDelivery: publishDto.regionOfDelivery,
        imageUrl: listedNFT.imageUrl,
        contractAddress: listedNFT.contractAddress,
        tokenId: listedNFT.tokenId,
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