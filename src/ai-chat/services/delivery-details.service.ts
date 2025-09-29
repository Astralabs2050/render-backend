import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { DeliveryDetails, DeliveryStatus } from '../entities/delivery-details.entity';
import { CreateDeliveryDetailsDto, UpdateDeliveryDetailsDto } from '../dto/delivery-details.dto';

@Injectable()
export class DeliveryDetailsService {
  private readonly logger = new Logger(DeliveryDetailsService.name);

  constructor(
    @InjectRepository(DeliveryDetails)
    private deliveryDetailsRepository: Repository<DeliveryDetails>,
  ) {}

  async create(dto: CreateDeliveryDetailsDto): Promise<DeliveryDetails> {
    const deliveryDetails = this.deliveryDetailsRepository.create(dto);
    return this.deliveryDetailsRepository.save(deliveryDetails);
  }

  async findByChatId(chatId: string): Promise<DeliveryDetails | null> {
    return this.deliveryDetailsRepository.findOne({
      where: { chatId },
      order: { createdAt: 'DESC' }
    });
  }

  async update(id: string, dto: UpdateDeliveryDetailsDto): Promise<DeliveryDetails> {
    const deliveryDetails = await this.deliveryDetailsRepository.findOne({ where: { id } });
    if (!deliveryDetails) {
      throw new NotFoundException('Delivery details not found');
    }

    Object.assign(deliveryDetails, dto);
    return this.deliveryDetailsRepository.save(deliveryDetails);
  }

  async updateStatus(chatId: string, status: DeliveryStatus): Promise<DeliveryDetails> {
    const deliveryDetails = await this.findByChatId(chatId);
    if (!deliveryDetails) {
      throw new NotFoundException('Delivery details not found');
    }

    deliveryDetails.status = status;
    return this.deliveryDetailsRepository.save(deliveryDetails);
  }

  async upsert(dto: CreateDeliveryDetailsDto, queryRunner?: QueryRunner): Promise<DeliveryDetails> {
    const repository = queryRunner ? queryRunner.manager.getRepository(DeliveryDetails) : this.deliveryDetailsRepository;
    
    const existing = await repository.findOne({
      where: { chatId: dto.chatId }
    });

    if (existing) {
      Object.assign(existing, dto);
      return repository.save(existing);
    }

    const deliveryDetails = repository.create(dto);
    return repository.save(deliveryDetails);
  }

  async delete(id: string): Promise<void> {
    await this.deliveryDetailsRepository.delete(id);
  }
}