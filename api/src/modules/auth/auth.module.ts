import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user.entity';
import { WorldOwnerService } from './world-owner.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [WorldOwnerService],
  exports: [WorldOwnerService],
})
export class AuthModule {}
