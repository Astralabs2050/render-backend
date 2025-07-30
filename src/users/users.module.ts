import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CreatorController } from './controllers/creator.controller';
import { MakerController } from './controllers/maker.controller';
import { User } from './entities/user.entity';
import { Web3Module } from '../web3/web3.module';
@Module({
  imports: [TypeOrmModule.forFeature([User]), Web3Module],
  controllers: [UsersController, CreatorController, MakerController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}