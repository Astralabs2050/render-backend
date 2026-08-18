import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DesignRecord, DesignStatus } from '../entities/design-record.entity';

@Injectable()
export class DesignRecordService {
  private readonly logger = new Logger(DesignRecordService.name);

  constructor(
    @InjectRepository(DesignRecord)
    private readonly designRepository: Repository<DesignRecord>,
  ) {}

  async create(data: Partial<DesignRecord>): Promise<DesignRecord> {
    const design = this.designRepository.create({
      ...data,
      status: data.status || DesignStatus.DRAFT,
    });
    return this.designRepository.save(design);
  }

  async update(id: string, data: Partial<DesignRecord>): Promise<DesignRecord> {
    const design = await this.findById(id);
    Object.assign(design, data);
    return this.designRepository.save(design);
  }

  async findById(id: string): Promise<DesignRecord> {
    const design = await this.designRepository.findOne({
      where: { id },
      relations: ['creator'],
    });
    if (!design) {
      throw new NotFoundException('Design record not found');
    }
    return design;
  }

  async findByCreator(creatorId: string): Promise<DesignRecord[]> {
    return this.designRepository.find({
      where: { creatorId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(filters?: { status?: DesignStatus; category?: string }): Promise<DesignRecord[]> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    return this.designRepository.find({
      where,
      relations: ['creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async publish(designId: string): Promise<DesignRecord> {
    const design = await this.findById(designId);
    if (design.status === DesignStatus.READY || design.status === DesignStatus.PUBLISHED) {
      return design;
    }
    design.status = DesignStatus.PUBLISHED;
    design.mintedAt = new Date();
    this.logger.log(`Design ${design.id} published`);
    return this.designRepository.save(design);
  }

  async list(designId: string): Promise<DesignRecord> {
    const design = await this.findById(designId);
    if (design.status !== DesignStatus.PUBLISHED && design.status !== DesignStatus.READY) {
      throw new BadRequestException('Design must be saved before listing');
    }
    design.status = DesignStatus.LISTED;
    return this.designRepository.save(design);
  }
}
