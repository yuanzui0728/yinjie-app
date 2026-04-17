import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { CharactersModule } from '../characters/characters.module';
import { SystemConfigModule } from '../config/config.module';
import { ActionConnectorEntity } from './action-connector.entity';
import { ActionRunEntity } from './action-run.entity';
import { ActionRuntimeRulesService } from './action-runtime-rules.service';
import { ActionRuntimeService } from './action-runtime.service';
import { CharacterEntity } from '../characters/character.entity';

@Module({
  imports: [
    AiModule,
    AuthModule,
    CharactersModule,
    SystemConfigModule,
    TypeOrmModule.forFeature([
      ActionConnectorEntity,
      ActionRunEntity,
      CharacterEntity,
    ]),
  ],
  providers: [ActionRuntimeRulesService, ActionRuntimeService],
  exports: [ActionRuntimeRulesService, ActionRuntimeService],
})
export class ActionRuntimeModule {}
