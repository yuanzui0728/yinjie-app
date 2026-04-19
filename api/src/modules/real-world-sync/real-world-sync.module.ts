import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharacterEntity } from '../characters/character.entity';
import { CharacterBlueprintEntity } from '../characters/character-blueprint.entity';
import { SystemConfigModule } from '../config/config.module';
import { MomentPostEntity } from '../moments/moment-post.entity';
import { CharacterRealWorldSignalEntity } from './character-real-world-signal.entity';
import { CharacterRealWorldDigestEntity } from './character-real-world-digest.entity';
import { CharacterRealWorldSyncRunEntity } from './character-real-world-sync-run.entity';
import { RealWorldRuntimeProfileService } from './real-world-runtime-profile.service';
import { RealWorldSyncRulesService } from './real-world-sync-rules.service';
import { RealWorldSyncService } from './real-world-sync.service';

@Module({
  imports: [
    SystemConfigModule,
    TypeOrmModule.forFeature([
      CharacterEntity,
      CharacterBlueprintEntity,
      MomentPostEntity,
      CharacterRealWorldSignalEntity,
      CharacterRealWorldDigestEntity,
      CharacterRealWorldSyncRunEntity,
    ]),
  ],
  providers: [
    RealWorldSyncRulesService,
    RealWorldSyncService,
    RealWorldRuntimeProfileService,
  ],
  exports: [
    RealWorldSyncRulesService,
    RealWorldSyncService,
    RealWorldRuntimeProfileService,
  ],
})
export class RealWorldSyncModule {}
