import { Injectable, NotFoundException, ConflictException, BadRequestException, ServiceUnavailableException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserType } from './entities/user.entity';
import { Collection } from './entities/collection.entity';
import { PaymentIntent } from './entities/payment-intent.entity';
import { ReconciliationJob } from './entities/reconciliation-job.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BrandDetailsDto } from './dto/brand-details.dto';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { CollectionPaymentDto } from './dto/collection-payment.dto';
import { Helpers } from '../common/utils/helpers';
import { ThirdwebService } from '../web3/services/thirdweb.service';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { Decimal } from 'decimal.js';
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Collection)
    private collectionRepository: Repository<Collection>,
    @InjectRepository(PaymentIntent)
    private paymentIntentRepository: Repository<PaymentIntent>,
    @InjectRepository(ReconciliationJob)
    private reconciliationJobRepository: Repository<ReconciliationJob>,
    private thirdwebService: ThirdwebService,
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
    if (profileData.location && profileData.category && profileData.skills) {
      user.profileCompleted = true;
      if (user.userType === 'maker' && !user.walletAddress) {
        const wallet = await this.thirdwebService.generateWallet();
        const encryptedPrivateKey = Helpers.encryptPrivateKey(wallet.privateKey);
        user.walletAddress = wallet.address;
        user.walletPrivateKey = encryptedPrivateKey;
        this.logger.log(`Wallet created for maker: ${user.email} - ${wallet.address}`);
      }
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

  async createCollection(userId: string, collectionData: CreateCollectionDto, designImages?: Express.Multer.File[]): Promise<any> {
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

    const totalPrice = new Decimal(collectionData.quantity).mul(collectionData.pricePerOutfit).toFixed(2);
    
    const collection = this.collectionRepository.create({
      creatorId: userId,
      collectionName: collectionData.collectionName,
      quantity: collectionData.quantity,
      pricePerOutfit: collectionData.pricePerOutfit,
      totalPrice,
      deliveryTimeLead: collectionData.deliveryTimeLead,
      deliveryRegion: collectionData.deliveryRegion,
      designImages: imageUrls,
      status: 'pending_payment'
    });

    const savedCollection = await this.collectionRepository.save(collection);
    this.logger.log(`Collection created for user: ${user.email}`);
    return savedCollection;
  }

  async processCollectionPayment(userId: string, collectionId: string, paymentDto: CollectionPaymentDto): Promise<any> {
    if (!userId || !collectionId) {
      throw new BadRequestException('Invalid user ID or collection ID');
    }


    const existingIntent = await this.paymentIntentRepository.findOne({
      where: { userId, collectionId }
    });

    if (existingIntent && existingIntent.status === 'completed') {
      const collection = await this.collectionRepository.findOne({
        where: { id: collectionId }
      });
      return {
        collectionId,
        paymentStatus: 'already_completed',
        transactionHash: collection.paymentTransactionHash,
        amount: collection.totalPrice,
        paidAt: collection.paidAt?.toISOString()
      };
    }

    const user = await this.findOne(userId);
    
    if (!user.walletAddress) {
      throw new BadRequestException('User wallet not configured');
    }


    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let collection: Collection;
    try {
      collection = await queryRunner.manager.findOne(Collection, {
        where: { id: collectionId, creatorId: userId },
        lock: { mode: 'pessimistic_write' }
      });

      if (!collection) {
        throw new NotFoundException('Collection not found');
      }

      if (collection.paymentTransactionHash) {
        await queryRunner.rollbackTransaction();
        return {
          collectionId,
          paymentStatus: 'already_completed',
          transactionHash: collection.paymentTransactionHash,
          amount: collection.totalPrice,
          paidAt: collection.paidAt?.toISOString()
        };
      }

      if (collection.status !== 'pending_payment') {
        throw new BadRequestException(`Invalid collection status: ${collection.status}`);
      }


      const paymentIntent = await queryRunner.manager.save(PaymentIntent, {
        userId,
        collectionId,
        status: 'pending'
      });
      
      this.logger.log('PaymentIntent created', {
        paymentIntentId: paymentIntent.id,
        collectionId,
        userId,
        status: 'pending'
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }


    let paymentResult;
    try {
      this.logger.log('Processing blockchain payment', {
        collectionId,
        collectionName: collection.collectionName,
        amount: collection.totalPrice,
        userId,
        walletAddress: user.walletAddress
      });
      

      paymentResult = await Promise.race([
        this.thirdwebService.processPayment({
          fromAddress: user.walletAddress,
          amount: new Decimal(collection.totalPrice).toNumber(),
          collectionId: collectionId
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Payment timeout after 30 seconds')), 30000)
        )
      ]) as { transactionHash: string; blockchainMetadata?: any };

      if (!paymentResult.transactionHash) {
        throw new ServiceUnavailableException('Payment processed but no transaction hash received');
      }
    } catch (error) {
     let actualPaymentResult = null;
      if (error.message.includes('timeout') || error.message.includes('network')) {
        try {
          this.logger.warn('Checking for false negative payment', {
            collectionId,
            userId,
            error: error.message
          });
          

          actualPaymentResult = await this.thirdwebService.checkPaymentStatus({
            fromAddress: user.walletAddress,
            amount: new Decimal(collection.totalPrice).toNumber(),
            collectionId: collectionId
          });
          
          if (actualPaymentResult?.transactionHash) {
            this.logger.warn('False negative detected - payment actually succeeded', {
              collectionId,
              transactionHash: actualPaymentResult.transactionHash,
              originalError: error.message
            });
            paymentResult = actualPaymentResult;
          }
        } catch (checkError) {
          this.logger.error('Failed to check payment status', {
            collectionId,
            userId,
            checkError: checkError.message
          });
        }
      }
      
      if (!actualPaymentResult) {
        const failedIntent = await this.paymentIntentRepository.findOne({ where: { userId, collectionId } });
        await this.paymentIntentRepository.update(
          { userId, collectionId },
          { status: 'failed' }
        );
        
        this.logger.error('Payment failed', {
          paymentIntentId: failedIntent?.id,
          collectionId,
          collectionName: collection.collectionName,
          amount: collection.totalPrice,
          userId,
          error: error.message
        });
        

        if (error.message.includes('insufficient funds') || error.message.includes('invalid address')) {
          throw new BadRequestException(`Payment failed: ${error.message}`);
        }
        
        throw new ServiceUnavailableException(`Payment processing failed: ${error.message}`);
      }
    }


    const updateRunner = this.dataSource.createQueryRunner();
    await updateRunner.connect();
    await updateRunner.startTransaction();

    try {
      const paidAt = new Date();
      
      await updateRunner.manager.update(Collection, 
        { id: collectionId },
        {
          status: 'paid',
          paymentTransactionHash: paymentResult.transactionHash,
          blockchainMetadata: paymentResult.blockchainMetadata || {
            transactionHash: paymentResult.transactionHash,
            timestamp: paidAt.toISOString()
          },
          paidAt
        }
      );

      const completedIntent = await updateRunner.manager.findOne(PaymentIntent, { where: { userId, collectionId } });
      await updateRunner.manager.update(PaymentIntent,
        { userId, collectionId },
        { status: 'completed' }
      );
      
      this.logger.log('PaymentIntent completed', {
        paymentIntentId: completedIntent?.id,
        collectionId,
        userId,
        status: 'completed'
      });

      await updateRunner.commitTransaction();


      const updatedCollection = await this.collectionRepository.findOne({
        where: { id: collectionId }
      });

      this.logger.log('Payment completed successfully', {
        collectionId,
        collectionName: collection.collectionName,
        transactionHash: paymentResult.transactionHash,
        amount: updatedCollection.totalPrice,
        userId,
        userEmail: user.email,
        paidAt: updatedCollection.paidAt.toISOString()
      });
      
      return {
        collectionId,
        paymentStatus: 'completed',
        transactionHash: paymentResult.transactionHash,
        amount: updatedCollection.totalPrice,
        paidAt: updatedCollection.paidAt.toISOString()
      };
    } catch (error) {
      await updateRunner.rollbackTransaction();
      this.logger.error('Database update failed after successful payment', {
        transactionHash: paymentResult.transactionHash,
        collectionId,
        userId,
        amount: collection.totalPrice,
        requiresReconciliation: true,
        error: error.message
      });
      
      
      await this.queueReconciliationJob(collectionId, paymentResult.transactionHash, new Decimal(collection.totalPrice).toNumber());
      
      throw new ServiceUnavailableException('Payment succeeded but database update failed. Transaction will be reconciled automatically.');
    } finally {
      await updateRunner.release();
    }
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