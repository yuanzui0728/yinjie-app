import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { AdminGamesController } from './admin-games.controller';
import { AdminGuard } from '../admin/admin.guard';
import { GameCatalogEntity } from './game-catalog.entity';
import { GameCatalogRevisionEntity } from './game-catalog-revision.entity';
import { GameCenterCurationEntity } from './game-center-curation.entity';
import { GameOwnerStateEntity } from './game-owner-state.entity';
import { GameSubmissionEntity } from './game-submission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameOwnerStateEntity,
      GameCatalogEntity,
      GameCatalogRevisionEntity,
      GameCenterCurationEntity,
      GameSubmissionEntity,
    ]),
    AuthModule,
  ],
  providers: [GamesService, AdminGuard],
  controllers: [GamesController, AdminGamesController],
  exports: [GamesService],
})
export class GamesModule {}
