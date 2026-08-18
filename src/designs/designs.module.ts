import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DesignRecord } from './entities/design-record.entity';
import { DesignRecordService } from './services/design-record.service';

@Module({
  imports: [TypeOrmModule.forFeature([DesignRecord])],
  providers: [DesignRecordService],
  exports: [DesignRecordService, TypeOrmModule],
})
export class DesignsModule {}
