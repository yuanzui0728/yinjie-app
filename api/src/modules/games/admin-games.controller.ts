import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { GamesService } from './games.service';

@Controller('admin/games')
@UseGuards(AdminGuard)
export class AdminGamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  getAdminCatalog() {
    return this.gamesService.getAdminCatalog();
  }

  @Get('curation')
  getAdminGameCenterCuration() {
    return this.gamesService.getAdminGameCenterCuration();
  }

  @Get(':id')
  getAdminCatalogItem(@Param('id') id: string) {
    return this.gamesService.getAdminCatalogItem(id);
  }

  @Post()
  createAdminCatalogItem(
    @Body()
    body: {
      id?: string;
      name?: string;
      slogan?: string;
      description?: string;
      studio?: string;
      badge?: string;
      heroLabel?: string;
      category?: string;
      tone?: string;
      playersLabel?: string;
      friendsLabel?: string;
      updateNote?: string;
      deckLabel?: string;
      estimatedDuration?: string;
      rewardLabel?: string;
      sessionObjective?: string;
      tags?: string[] | null;
      publisherKind?: string;
      productionKind?: string;
      runtimeMode?: string;
      reviewStatus?: string;
      visibilityScope?: string;
      sourceCharacterId?: string | null;
      sourceCharacterName?: string | null;
      aiHighlights?: string[] | null;
      sortOrder?: number;
    },
  ) {
    return this.gamesService.createAdminCatalogItem(body);
  }

  @Patch('curation')
  updateAdminGameCenterCuration(
    @Body()
    body: {
      featuredGameIds?: string[];
      shelves?: Array<{
        id: string;
        title: string;
        description: string;
        gameIds: string[];
      }>;
      hotRankings?: Array<{
        gameId: string;
        rank: number;
        note: string;
      }>;
      newRankings?: Array<{
        gameId: string;
        rank: number;
        note: string;
      }>;
      events?: Array<{
        id: string;
        title: string;
        description: string;
        meta: string;
        ctaLabel: string;
        relatedGameId: string;
        actionKind: string;
        tone: string;
      }>;
      stories?: Array<{
        id: string;
        title: string;
        description: string;
        eyebrow: string;
        authorName: string;
        ctaLabel: string;
        publishedAt: string;
        kind: string;
        tone: string;
        relatedGameId?: string | null;
      }>;
    },
  ) {
    return this.gamesService.updateAdminGameCenterCuration(body);
  }

  @Patch(':id')
  updateAdminCatalogItem(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      slogan?: string;
      description?: string;
      studio?: string;
      badge?: string;
      heroLabel?: string;
      category?: string;
      tone?: string;
      playersLabel?: string;
      friendsLabel?: string;
      updateNote?: string;
      deckLabel?: string;
      estimatedDuration?: string;
      rewardLabel?: string;
      sessionObjective?: string;
      tags?: string[] | null;
      publisherKind?: string;
      productionKind?: string;
      runtimeMode?: string;
      reviewStatus?: string;
      visibilityScope?: string;
      sourceCharacterId?: string | null;
      sourceCharacterName?: string | null;
      aiHighlights?: string[] | null;
      sortOrder?: number;
    },
  ) {
    return this.gamesService.updateAdminCatalogItem(id, body);
  }
}
