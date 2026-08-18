import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserType } from './entities/user.entity';
import { Design } from './entities/collection.entity';
import { PaymentIntent } from './entities/payment-intent.entity';
import { ReconciliationJob } from './entities/reconciliation-job.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BrandDetailsDto } from './dto/brand-details.dto';
import { CreateDesignDto } from './dto/create-collection.dto';
import { Helpers } from '../common/utils/helpers';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { Decimal } from 'decimal.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Design)
    private collectionRepository: Repository<Design>,
    @InjectRepository(PaymentIntent)
    private paymentIntentRepository: Repository<PaymentIntent>,
    @InjectRepository(ReconciliationJob)
    private reconciliationJobRepository: Repository<ReconciliationJob>,
    private cloudinaryService: CloudinaryService,
    private dataSource: DataSource,
  ) {}
  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists`);
    }
    const hashedPassword = await Helpers.hashPassword(password);
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    const savedUser = await this.usersRepository.save(user);
    this.logger.log(`Created user with ID: ${savedUser.id}`);
    Helpers.logData('New User', Helpers.sanitizeUser(savedUser));
    return savedUser;
  }
  async findAll(): Promise<User[]> {
    const users = await this.usersRepository.find();
    this.logger.log(`Found ${users.length} users`);
    return users;
  }
  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      this.logger.warn(`User with ID ${id} not found`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }
  async findByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      this.logger.warn(`User with email ${email} not found`);
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (updateUserDto.password) {
      updateUserDto.password = await Helpers.hashPassword(updateUserDto.password);
    }
    Object.assign(user, updateUserDto);
    const updatedUser = await this.usersRepository.save(user);
    this.logger.log(`Updated user with ID: ${id}`);
    return updatedUser;
  }
  async completeProfile(id: string, profileData: any): Promise<User> {
    const user = await this.findOne(id);
    if (profileData.location) user.location = profileData.location;
    if (profileData.category) user.category = profileData.category;
    if (profileData.skills) user.skills = profileData.skills;
    if (profileData.governmentIdImages) user.governmentIdImages = profileData.governmentIdImages;
    if (profileData.nameOnId) user.nameOnId = profileData.nameOnId;
    if (profileData.idCountryOfIssue) user.idCountryOfIssue = profileData.idCountryOfIssue;
    if (profileData.idExpiryDate) user.idExpiryDate = new Date(profileData.idExpiryDate);
    if (profileData.businessCertificateImage) user.businessCertificateImage = profileData.businessCertificateImage;
    if (profileData.businessName) user.businessName = profileData.businessName;
    if (profileData.businessCountryOfRegistration) user.businessCountryOfRegistration = profileData.businessCountryOfRegistration;
    if (profileData.businessType) user.businessType = profileData.businessType;
    if (profileData.taxRegistrationNumber) user.taxRegistrationNumber = profileData.taxRegistrationNumber;
    if (profileData.workExperience) user.workExperience = profileData.workExperience;
    if (profileData.projects) user.projects = profileData.projects;
    if (profileData.profilePicture) user.profilePicture = profileData.profilePicture;
    if (user.location && user.category) {
      user.profileCompleted = true;
    }
    if (profileData.governmentIdImages && profileData.nameOnId) {
      user.identityVerified = false;
    }
    const updatedUser = await this.usersRepository.save(user);
    this.logger.log(`Profile updated for user: ${user.email}`);
    return updatedUser;
  }
  async submitIdentityVerification(id: string, identityData: any): Promise<User> {
    const user = await this.findOne(id);
    user.governmentIdImages = identityData.governmentIdImages;
    user.nameOnId = identityData.nameOnId;
    user.idCountryOfIssue = identityData.idCountryOfIssue;
    user.idExpiryDate = new Date(identityData.idExpiryDate);
    user.businessCertificateImage = identityData.businessCertificateImage;
    user.businessName = identityData.businessName;
    user.businessCountryOfRegistration = identityData.businessCountryOfRegistration;
    user.businessType = identityData.businessType;
    user.taxRegistrationNumber = identityData.taxRegistrationNumber;
    user.identityVerified = false; 
    const updatedUser = await this.usersRepository.save(user);
    this.logger.log(`Identity verification submitted for user: ${user.email}`);
    return updatedUser;
  }
  async addBrandDetails(id: string, brandData: BrandDetailsDto, brandLogo?: Express.Multer.File): Promise<User> {
    const user = await this.findOne(id);
    
    user.brandName = brandData.brandName;
    user.brandOrigin = brandData.brandOrigin;
    if (brandData.brandStory) user.brandStory = brandData.brandStory;
    
    if (brandLogo) {
      const uploadResult = await this.cloudinaryService.uploadImage(brandLogo.buffer, {
        folder: 'astra-fashion/brands',
        public_id: `brand-logo-${id}`,
        tags: ['brand', 'logo', id]
      });
      user.brandLogo = uploadResult.secure_url;
    }

    const updatedUser = await this.usersRepository.save(user);
    this.logger.log(`Brand details updated for user: ${user.email}`);
    return updatedUser;
  }

  private async queueReconciliationJob(collectionId: string, transactionHash: string, amount: number): Promise<void> {
    try {
      const job = this.reconciliationJobRepository.create({
        collectionId,
        transactionHash,
        amount: amount.toFixed(2),
        status: 'pending'
      });
      
      await this.reconciliationJobRepository.save(job);
      
      this.logger.log('Reconciliation job queued', {
        jobId: job.id,
        collectionId,
        transactionHash,
        amount
      });
    } catch (error) {
      this.logger.error('Failed to queue reconciliation job', {
        collectionId,
        transactionHash,
        error: error.message
      });
    }
  }

  async createCollection(userId: string, collectionData: CreateDesignDto, designImages?: Express.Multer.File[]): Promise<any> {
    const user = await this.findOne(userId);
    
     if (!user.brandName || !user.brandOrigin) {
      throw new BadRequestException('Brand details must be created before creating collections');
    }
    
    if (!designImages || designImages.length === 0) {
      throw new ConflictException('At least 1 design image is required');
    }
    
    if (designImages.length > 4) {
      throw new ConflictException('Maximum 4 design images allowed');
    }

    // Upload design images to Cloudinary
    const imageUrls = [];
    for (let i = 0; i < designImages.length; i++) {
      const uploadResult = await this.cloudinaryService.uploadImage(designImages[i].buffer, {
        folder: 'astra-fashion/collections',
        public_id: `collection-${userId}-${Date.now()}-${i}`,
        tags: ['collection', 'design', userId]
      });
      imageUrls.push(uploadResult.secure_url);
    }

    const design = this.collectionRepository.create({
      creatorId: userId,
      name: collectionData.name,
      price: collectionData.price,
      amountOfPieces: collectionData.amountOfPieces,
      location: collectionData.location,
      deadline: collectionData.deadline,
      designImages: imageUrls,
      status: 'pending_payment'
    });

    const savedCollection = await this.collectionRepository.save(design);
    this.logger.log(`Collection created for user: ${user.email}`);
    return savedCollection;
  }

  async processCollectionPayment(userId: string, collectionId: string): Promise<any> {
    if (!userId || !collectionId) {
      throw new BadRequestException('Invalid user ID or collection ID');
    }

    const collection = await this.collectionRepository.findOne({
      where: { id: collectionId, creatorId: userId },
    });
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.paymentTransactionHash || collection.status === 'paid') {
      return {
        collectionId,
        paymentStatus: 'completed',
        transactionHash: collection.paymentTransactionHash,
        amount: collection.price,
        paidAt: collection.paidAt?.toISOString(),
      };
    }

    const paidAt = new Date();
    const reference = `listing_${collectionId}_${Date.now()}`;
    await this.collectionRepository.update(collectionId, {
      status: 'paid',
      paymentTransactionHash: reference,
      paidAt,
      blockchainMetadata: {
        transactionHash: reference,
        timestamp: paidAt.toISOString(),
      },
    });

    await this.paymentIntentRepository.save({
      userId,
      collectionId,
      status: 'completed',
    });

    this.logger.log(`Collection ${collectionId} marked paid without blockchain`);
    return {
      collectionId,
      paymentStatus: 'completed',
      transactionHash: reference,
      amount: collection.price,
      paidAt: paidAt.toISOString(),
    };
  }

  async getMakerEarnings(makerId: string): Promise<any> {
    const maker = await this.findOne(makerId);
    if (maker.userType !== UserType.MAKER) {
      throw new BadRequestException('Only makers can view earnings');
    }

    // Get completed jobs for earnings calculation
    const completedJobs = await this.dataSource.query(`
      SELECT j.id, j.title, j.budget, j."completedAt", j."acceptedAt", u."fullName" as "creatorName", u."brandName"
      FROM jobs j
      LEFT JOIN users u ON u.id = j."creatorId"
      WHERE j."makerId" = $1 AND j.status = 'completed'
      ORDER BY j."completedAt" DESC
    `, [makerId]);

    // Get in-progress jobs for pending earnings
    const inProgressJobs = await this.dataSource.query(`
      SELECT j.id, j.title, j.budget, j."acceptedAt", u."fullName" as "creatorName", u."brandName"
      FROM jobs j
      LEFT JOIN users u ON u.id = j."creatorId"
      WHERE j."makerId" = $1 AND j.status = 'in_progress'
      ORDER BY j."acceptedAt" DESC
    `, [makerId]);

    const totalEarnings = completedJobs.reduce((sum, job) => sum.plus(new Decimal(job.budget)), new Decimal(0)).toNumber();
    const pendingEarnings = inProgressJobs.reduce((sum, job) => sum.plus(new Decimal(job.budget)), new Decimal(0)).toNumber();
    const availableEarnings = new Decimal(totalEarnings).mul(0.9).toNumber(); // Assuming 10% platform fee
    const totalJobsCompleted = completedJobs.length;

    // Recent activities (last 20)
    const recentActivities = [
      ...completedJobs.map(job => ({
        timestamp: job.completedAt,
        description: `Completed job: ${job.title}`,
        brandName: job.brandName || job.creatorName,
        status: 'completed',
        amount: new Decimal(job.budget).toNumber(),
        paymentStatus: 'paid'
      })),
      ...inProgressJobs.map(job => ({
        timestamp: job.acceptedAt,
        description: `Started job: ${job.title}`,
        brandName: job.brandName || job.creatorName,
        status: 'pending',
        amount: new Decimal(job.budget).toNumber(),
        paymentStatus: 'pending'
      }))
    ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

    return {
      totalEarnings,
      pendingEarnings,
      availableEarnings,
      totalJobsCompleted,
      recentActivities
    };
  }

  async ensureUserHasWallet(userId: string): Promise<string | null> {
    // Chain wallets removed — custodial balance is in /wallet/me
    await this.findOne(userId);
    return null;
  }

  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      this.logger.warn(`Failed to delete user with ID ${id} - not found`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    this.logger.log(`Deleted user with ID: ${id}`);
  }


}