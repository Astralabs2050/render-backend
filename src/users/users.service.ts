import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Helpers } from '../common/utils/helpers';
import { ThirdwebService } from '../web3/services/thirdweb.service';
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private thirdwebService: ThirdwebService,
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
  async remove(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      this.logger.warn(`Failed to delete user with ID ${id} - not found`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    this.logger.log(`Deleted user with ID: ${id}`);
  }
}