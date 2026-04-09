import { Module } from '@nestjs/common';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { AiController } from './ai.controller';
import { PromptBuilderService } from './prompt-builder.service';
import { SystemConfigModule } from '../config/config.module';
import { WorldModule } from '../world/world.module';

@Module({
  imports: [SystemConfigModule, WorldModule],
  controllers: [AiController],
  providers: [AiOrchestratorService, PromptBuilderService],
  exports: [AiOrchestratorService, PromptBuilderService],
})
export class AiModule {}
