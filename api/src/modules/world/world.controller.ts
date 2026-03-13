import { Controller, Get } from '@nestjs/common';
import { WorldService } from './world.service';

@Controller('world')
export class WorldController {
  constructor(private readonly worldService: WorldService) {}

  @Get('context')
  getLatest() {
    return this.worldService.getLatest();
  }
}
