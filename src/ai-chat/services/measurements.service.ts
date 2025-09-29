import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { Measurements } from '../entities/measurements.entity';
import { CreateMeasurementsDto, UpdateMeasurementsDto } from '../dto/measurements.dto';

@Injectable()
export class MeasurementsService {
  private readonly logger = new Logger(MeasurementsService.name);

  constructor(
    @InjectRepository(Measurements)
    private measurementsRepository: Repository<Measurements>,
  ) {}

  async create(dto: CreateMeasurementsDto): Promise<Measurements> {
    const measurements = this.measurementsRepository.create(dto);
    return this.measurementsRepository.save(measurements);
  }

  async findByChatId(chatId: string): Promise<Measurements | null> {
    return this.measurementsRepository.findOne({
      where: { chatId },
      order: { createdAt: 'DESC' }
    });
  }

  async update(id: string, dto: UpdateMeasurementsDto): Promise<Measurements> {
    const measurements = await this.measurementsRepository.findOne({ where: { id } });
    if (!measurements) {
      throw new NotFoundException('Measurements not found');
    }

    Object.assign(measurements, dto);
    return this.measurementsRepository.save(measurements);
  }

  async upsert(dto: CreateMeasurementsDto, queryRunner?: QueryRunner): Promise<Measurements> {
    const repository = queryRunner ? queryRunner.manager.getRepository(Measurements) : this.measurementsRepository;
    
    const existing = await repository.findOne({
      where: { chatId: dto.chatId }
    });

    if (existing) {
      Object.assign(existing, dto);
      return repository.save(existing);
    }

    const measurements = repository.create(dto);
    return repository.save(measurements);
  }

  async delete(id: string): Promise<void> {
    await this.measurementsRepository.delete(id);
  }
}