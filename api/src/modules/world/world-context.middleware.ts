import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { WorldService } from './world.service';

@Injectable()
export class WorldContextMiddleware implements NestMiddleware {
  constructor(private readonly worldService: WorldService) {}

  async use(request: Request, _response: Response, next: NextFunction) {
    try {
      await this.worldService.syncRequestLocation(request);
    } catch {
      // Ignore location refresh failures so API requests are never blocked.
    }

    next();
  }
}
