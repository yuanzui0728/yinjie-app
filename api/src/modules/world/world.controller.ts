import { Body, Controller, Delete, Get, Patch } from '@nestjs/common';
import { WorldService } from './world.service';
import { WorldOwnerService } from '../auth/world-owner.service';
import type { ChatBackgroundAsset } from '../chat/chat-background.types';

@Controller('world')
export class WorldController {
  constructor(
    private readonly worldService: WorldService,
    private readonly worldOwnerService: WorldOwnerService,
  ) {}

  @Get('context')
  getLatest() {
    return this.worldService.getLatest();
  }

  @Get('owner')
  getOwner() {
    return this.worldOwnerService.getOwnerProfile();
  }

  @Patch('owner')
  updateOwner(
    @Body() body: { username?: string; avatar?: string; signature?: string; onboardingCompleted?: boolean },
  ) {
    return this.worldOwnerService.updateOwner(body);
  }

  @Patch('owner/api-key')
  setOwnerApiKey(@Body() body: { apiKey: string; apiBase?: string }) {
    return this.worldOwnerService.setOwnerApiKey(body.apiKey, body.apiBase);
  }

  @Patch('owner/chat-background')
  setOwnerChatBackground(@Body() body: { background: ChatBackgroundAsset }) {
    return this.worldOwnerService.setDefaultChatBackground(body.background);
  }

  @Delete('owner/chat-background')
  clearOwnerChatBackground() {
    return this.worldOwnerService.clearDefaultChatBackground();
  }

  @Delete('owner/api-key')
  clearOwnerApiKey() {
    return this.worldOwnerService.clearOwnerApiKey();
  }
}
