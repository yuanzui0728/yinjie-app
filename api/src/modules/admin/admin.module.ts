import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { UserEntity } from '../auth/user.entity';
import { CharacterEntity } from '../characters/character.entity';
import { MessageEntity } from '../chat/message.entity';
import { SystemConfigEntity } from '../config/config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      CharacterEntity,
      MessageEntity,
      SystemConfigEntity,
    ]),
  ],
  providers: [AdminService, AdminGuard],
  controllers: [AdminController],
})
export class AdminModule {}
