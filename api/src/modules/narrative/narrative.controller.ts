import { Controller, Get } from '@nestjs/common';
import { NarrativeService } from './narrative.service';

@Controller('narrative')
export class NarrativeController {
  constructor(private readonly narrativeService: NarrativeService) {}

  @Get()
  getNarratives() {
    return this.narrativeService.getForCurrentWorld();
  }
}
