import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorldContextEntity } from './world-context.entity';
import { WorldService } from './world.service';
import { WorldController } from './world.controller';
import { ColdStartService } from './cold-start.service';
import { AuthModule } from '../auth/auth.module';
import { UserEntity } from '../auth/user.entity';
import { FriendRequestEntity } from '../social/friend-request.entity';
import { CharacterEntity } from '../characters/character.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorldContextEntity, UserEntity, FriendRequestEntity, CharacterEntity]), AuthModule],
  providers: [WorldService, ColdStartService],
  controllers: [WorldController],
  exports: [WorldService, ColdStartService],
})
export class WorldModule {}
