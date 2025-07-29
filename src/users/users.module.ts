import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CreatorController } from './controllers/creator.controller';
import { MakerController } from './controllers/maker.controller';
import { User } from './entities/user.entity';
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController, CreatorController, MakerController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}