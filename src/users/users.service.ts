import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Helpers } from '../common/utils/helpers';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;
    
    // Check if user exists
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists`);
    }
    
    // Hash password
    const hashedPassword = await Helpers.hashPassword(password);
    
    // Create user
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
    
    // If updating password, hash it
    if (updateUserDto.password) {
      updateUserDto.password = await Helpers.hashPassword(updateUserDto.password);
    }
    
    Object.assign(user, updateUserDto);
    const updatedUser = await this.usersRepository.save(user);
    this.logger.log(`Updated user with ID: ${id}`);
    
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