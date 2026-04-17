import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorldOwnerService } from '../auth/world-owner.service';
import {
  createDefaultGameCenterOwnerState,
  GAME_CENTER_HOME_SEED,
  cloneGameCenterCurationSeed,
  cloneGameCenterHomeSeed,
} from './game-center.data';
import { GameCatalogEntity } from './game-catalog.entity';
import { GameCenterCurationEntity } from './game-center-curation.entity';
import { GameOwnerStateEntity } from './game-owner-state.entity';

const MAX_RECENT_GAMES = 6;
const MAX_PINNED_GAMES = 8;

type SerializedGameCenterOwnerState = ReturnType<
  typeof createDefaultGameCenterOwnerState
>;

type SerializedGameCenterCuration = ReturnType<
  typeof cloneGameCenterCurationSeed
> & {
  updatedAt: string;
};

type CreateAdminGameInput = {
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
};

type UpdateAdminGameInput = Omit<CreateAdminGameInput, 'id'>;

type UpdateAdminGameCenterCurationInput = {
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
};

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameOwnerStateEntity)
    private readonly ownerStateRepo: Repository<GameOwnerStateEntity>,
    @InjectRepository(GameCatalogEntity)
    private readonly catalogRepo: Repository<GameCatalogEntity>,
    @InjectRepository(GameCenterCurationEntity)
    private readonly curationRepo: Repository<GameCenterCurationEntity>,
    private readonly worldOwnerService: WorldOwnerService,
  ) {}

  async getGameCenterHome() {
    const seed = cloneGameCenterHomeSeed();
    const catalogEntries = await this.listCatalogEntities();
    const games = catalogEntries.map((entry) => this.serializeGame(entry));
    const knownGameIds = new Set(games.map((game) => game.id));
    const [curationEntity, ownerStateEntity] = await Promise.all([
      this.ensureCurationEntity(),
      this.ensureOwnerState(),
    ]);
    const curation = this.serializeGameCenterCuration(curationEntity, knownGameIds);
    const ownerState = this.serializeOwnerState(ownerStateEntity, knownGameIds);

    return {
      ...seed,
      featuredGameIds: curation.featuredGameIds,
      shelves: curation.shelves,
      hotRankings: curation.hotRankings,
      newRankings: curation.newRankings,
      friendActivities: seed.friendActivities.filter((item) =>
        knownGameIds.has(item.gameId),
      ),
      events: curation.events,
      stories: curation.stories,
      games,
      ownerState,
      generatedAt: new Date().toISOString(),
    };
  }

  async getOwnerState() {
    const [entity, knownGameIds] = await Promise.all([
      this.ensureOwnerState(),
      this.getKnownGameIdSet(),
    ]);

    return this.serializeOwnerState(entity, knownGameIds);
  }

  async launchGame(gameId: string) {
    const [entity, knownGameIds] = await Promise.all([
      this.ensureOwnerState(),
      this.getKnownGameIdSet(),
    ]);

    if (!knownGameIds.has(gameId)) {
      throw new NotFoundException('游戏不存在');
    }

    const current = this.serializeOwnerState(entity, knownGameIds);
    const openedAt = new Date().toISOString();

    return this.persistOwnerState(
      entity,
      {
        ...current,
        activeGameId: gameId,
        recentGameIds: [gameId, ...current.recentGameIds.filter((id) => id !== gameId)].slice(
          0,
          MAX_RECENT_GAMES,
        ),
        launchCountById: {
          ...current.launchCountById,
          [gameId]: (current.launchCountById[gameId] ?? 0) + 1,
        },
        lastOpenedAtById: {
          ...current.lastOpenedAtById,
          [gameId]: openedAt,
        },
        updatedAt: openedAt,
      },
      knownGameIds,
    );
  }

  async setPinnedState(gameId: string, pinned: boolean) {
    const [entity, knownGameIds] = await Promise.all([
      this.ensureOwnerState(),
      this.getKnownGameIdSet(),
    ]);

    if (!knownGameIds.has(gameId)) {
      throw new NotFoundException('游戏不存在');
    }

    const current = this.serializeOwnerState(entity, knownGameIds);
    const pinnedGameIds = pinned
      ? [gameId, ...current.pinnedGameIds.filter((id) => id !== gameId)].slice(
          0,
          MAX_PINNED_GAMES,
        )
      : current.pinnedGameIds.filter((id) => id !== gameId);

    return this.persistOwnerState(
      entity,
      {
        ...current,
        pinnedGameIds,
        updatedAt: new Date().toISOString(),
      },
      knownGameIds,
    );
  }

  async dismissActiveGame() {
    const [entity, knownGameIds] = await Promise.all([
      this.ensureOwnerState(),
      this.getKnownGameIdSet(),
    ]);
    const current = this.serializeOwnerState(entity, knownGameIds);

    return this.persistOwnerState(
      entity,
      {
        ...current,
        activeGameId: null,
        updatedAt: new Date().toISOString(),
      },
      knownGameIds,
    );
  }

  async getAdminCatalog() {
    const entries = await this.listCatalogEntities();
    return entries.map((entry) => this.serializeAdminCatalogItem(entry));
  }

  async getAdminCatalogItem(id: string) {
    const entry = await this.getCatalogEntryOrThrow(id);
    return this.serializeAdminCatalogItem(entry);
  }

  async createAdminCatalogItem(input: CreateAdminGameInput) {
    await this.ensureCatalogSeeded();
    const id = this.normalizeGameId(input.id);
    const name = this.normalizeRequiredText(input.name, 'name', '游戏名称');
    const existing = await this.catalogRepo.findOne({ where: { id } });
    if (existing) {
      throw new BadRequestException('游戏 ID 已存在');
    }

    const sortOrder =
      typeof input.sortOrder === 'number' && Number.isFinite(input.sortOrder)
        ? input.sortOrder
        : await this.getNextSortOrder();

    const entry = this.catalogRepo.create({
      id,
      name,
      slogan: this.normalizeText(input.slogan, `${name} 的一句话介绍`),
      description: this.normalizeText(
        input.description,
        `${name} 的 AI 游戏说明待补充。`,
      ),
      studio: this.normalizeText(input.studio, '待定工作室'),
      badge: this.normalizeText(input.badge, '待发布'),
      heroLabel: this.normalizeText(input.heroLabel, 'AI 游戏草稿'),
      category: this.normalizeText(input.category, 'featured'),
      tone: this.normalizeText(input.tone, 'forest'),
      playersLabel: this.normalizeText(input.playersLabel, '0 人在玩'),
      friendsLabel: this.normalizeText(input.friendsLabel, '暂无好友在玩'),
      updateNote: this.normalizeText(input.updateNote, '等待首个版本说明'),
      deckLabel: this.normalizeText(input.deckLabel, '目录草稿'),
      estimatedDuration: this.normalizeText(input.estimatedDuration, '待定'),
      rewardLabel: this.normalizeText(input.rewardLabel, '待定'),
      sessionObjective: this.normalizeText(
        input.sessionObjective,
        '待补充本局目标与玩法重点。',
      ),
      tagsPayload: this.normalizeStringArray(input.tags),
      publisherKind: this.normalizeText(input.publisherKind, 'platform_official'),
      productionKind: this.normalizeText(input.productionKind, 'ai_assisted'),
      runtimeMode: this.normalizeText(input.runtimeMode, 'workspace_mock'),
      reviewStatus: this.normalizeText(input.reviewStatus, 'pending_review'),
      visibilityScope: this.normalizeText(input.visibilityScope, 'internal'),
      sourceCharacterId: this.normalizeNullableText(input.sourceCharacterId),
      sourceCharacterName: this.normalizeNullableText(input.sourceCharacterName),
      aiHighlightsPayload: this.normalizeStringArray(input.aiHighlights),
      sortOrder,
    });

    const saved = await this.catalogRepo.save(entry);
    return this.serializeAdminCatalogItem(saved);
  }

  async updateAdminCatalogItem(id: string, input: UpdateAdminGameInput) {
    const entry = await this.getCatalogEntryOrThrow(id);

    if (input.name !== undefined) {
      entry.name = this.normalizeRequiredText(input.name, 'name', '游戏名称');
    }
    if (input.slogan !== undefined) {
      entry.slogan = this.normalizeText(input.slogan, entry.slogan);
    }
    if (input.description !== undefined) {
      entry.description = this.normalizeText(input.description, entry.description);
    }
    if (input.studio !== undefined) {
      entry.studio = this.normalizeText(input.studio, entry.studio);
    }
    if (input.badge !== undefined) {
      entry.badge = this.normalizeText(input.badge, entry.badge);
    }
    if (input.heroLabel !== undefined) {
      entry.heroLabel = this.normalizeText(input.heroLabel, entry.heroLabel);
    }
    if (input.category !== undefined) {
      entry.category = this.normalizeText(input.category, entry.category);
    }
    if (input.tone !== undefined) {
      entry.tone = this.normalizeText(input.tone, entry.tone);
    }
    if (input.playersLabel !== undefined) {
      entry.playersLabel = this.normalizeText(input.playersLabel, entry.playersLabel);
    }
    if (input.friendsLabel !== undefined) {
      entry.friendsLabel = this.normalizeText(input.friendsLabel, entry.friendsLabel);
    }
    if (input.updateNote !== undefined) {
      entry.updateNote = this.normalizeText(input.updateNote, entry.updateNote);
    }
    if (input.deckLabel !== undefined) {
      entry.deckLabel = this.normalizeText(input.deckLabel, entry.deckLabel);
    }
    if (input.estimatedDuration !== undefined) {
      entry.estimatedDuration = this.normalizeText(
        input.estimatedDuration,
        entry.estimatedDuration,
      );
    }
    if (input.rewardLabel !== undefined) {
      entry.rewardLabel = this.normalizeText(input.rewardLabel, entry.rewardLabel);
    }
    if (input.sessionObjective !== undefined) {
      entry.sessionObjective = this.normalizeText(
        input.sessionObjective,
        entry.sessionObjective,
      );
    }
    if (input.publisherKind !== undefined) {
      entry.publisherKind = this.normalizeText(
        input.publisherKind,
        entry.publisherKind,
      );
    }
    if (input.productionKind !== undefined) {
      entry.productionKind = this.normalizeText(
        input.productionKind,
        entry.productionKind,
      );
    }
    if (input.runtimeMode !== undefined) {
      entry.runtimeMode = this.normalizeText(input.runtimeMode, entry.runtimeMode);
    }
    if (input.reviewStatus !== undefined) {
      entry.reviewStatus = this.normalizeText(
        input.reviewStatus,
        entry.reviewStatus,
      );
    }
    if (input.visibilityScope !== undefined) {
      entry.visibilityScope = this.normalizeText(
        input.visibilityScope,
        entry.visibilityScope,
      );
    }
    if (input.sourceCharacterId !== undefined) {
      entry.sourceCharacterId = this.normalizeNullableText(input.sourceCharacterId);
    }
    if (input.sourceCharacterName !== undefined) {
      entry.sourceCharacterName = this.normalizeNullableText(
        input.sourceCharacterName,
      );
    }
    if (input.tags !== undefined) {
      entry.tagsPayload = this.normalizeStringArray(input.tags);
    }
    if (input.aiHighlights !== undefined) {
      entry.aiHighlightsPayload = this.normalizeStringArray(input.aiHighlights);
    }
    if (
      typeof input.sortOrder === 'number' &&
      Number.isFinite(input.sortOrder)
    ) {
      entry.sortOrder = input.sortOrder;
    }

    const saved = await this.catalogRepo.save(entry);
    return this.serializeAdminCatalogItem(saved);
  }

  async getAdminGameCenterCuration() {
    const [entity, knownGameIds] = await Promise.all([
      this.ensureCurationEntity(),
      this.getKnownGameIdSet(),
    ]);

    return this.serializeGameCenterCuration(entity, knownGameIds);
  }

  async updateAdminGameCenterCuration(input: UpdateAdminGameCenterCurationInput) {
    const [entity, knownGameIds] = await Promise.all([
      this.ensureCurationEntity(),
      this.getKnownGameIdSet(),
    ]);
    const current = this.serializeGameCenterCuration(entity, knownGameIds);

    const nextState: SerializedGameCenterCuration = {
      featuredGameIds:
        input.featuredGameIds !== undefined
          ? this.normalizeFeaturedGameIds(input.featuredGameIds, knownGameIds)
          : current.featuredGameIds,
      shelves:
        input.shelves !== undefined
          ? this.normalizeShelves(input.shelves, knownGameIds)
          : current.shelves,
      hotRankings:
        input.hotRankings !== undefined
          ? this.normalizeRankings(input.hotRankings, knownGameIds, '热门榜')
          : current.hotRankings,
      newRankings:
        input.newRankings !== undefined
          ? this.normalizeRankings(input.newRankings, knownGameIds, '新游榜')
          : current.newRankings,
      events:
        input.events !== undefined
          ? this.normalizeEvents(input.events, knownGameIds)
          : current.events,
      stories:
        input.stories !== undefined
          ? this.normalizeStories(input.stories, knownGameIds)
          : current.stories,
      updatedAt: new Date().toISOString(),
    };

    return this.persistGameCenterCuration(entity, nextState, knownGameIds);
  }

  private async ensureCatalogSeeded() {
    const existingIds = new Set(
      (
        await this.catalogRepo.find({
          select: ['id'],
        })
      ).map((entry) => entry.id),
    );

    const missingSeedEntries = GAME_CENTER_HOME_SEED.games
      .map((game, index) => ({ game, sortOrder: index }))
      .filter(({ game }) => !existingIds.has(game.id))
      .map(({ game, sortOrder }) =>
        this.catalogRepo.create({
          id: game.id,
          name: game.name,
          slogan: game.slogan,
          description: game.description,
          studio: game.studio,
          badge: game.badge,
          heroLabel: game.heroLabel,
          category: game.category,
          tone: game.tone,
          playersLabel: game.playersLabel,
          friendsLabel: game.friendsLabel,
          updateNote: game.updateNote,
          deckLabel: game.deckLabel,
          estimatedDuration: game.estimatedDuration,
          rewardLabel: game.rewardLabel,
          sessionObjective: game.sessionObjective,
          tagsPayload: [...game.tags],
          publisherKind: game.publisherKind,
          productionKind: game.productionKind,
          runtimeMode: game.runtimeMode,
          reviewStatus: game.reviewStatus,
          visibilityScope: game.visibilityScope,
          sourceCharacterId: game.sourceCharacterId ?? null,
          sourceCharacterName: game.sourceCharacterName ?? null,
          aiHighlightsPayload: [...game.aiHighlights],
          sortOrder,
        }),
      );

    if (missingSeedEntries.length > 0) {
      await this.catalogRepo.save(missingSeedEntries);
    }
  }

  private async listCatalogEntities() {
    await this.ensureCatalogSeeded();
    return this.catalogRepo.find({
      order: {
        sortOrder: 'ASC',
        createdAt: 'ASC',
      },
    });
  }

  private async getCatalogEntryOrThrow(id: string) {
    await this.ensureCatalogSeeded();
    const entry = await this.catalogRepo.findOne({
      where: {
        id,
      },
    });

    if (!entry) {
      throw new NotFoundException('游戏不存在');
    }

    return entry;
  }

  private async ensureCurationEntity() {
    const existing = await this.curationRepo.findOne({
      where: {
        id: 'default',
      },
    });

    if (existing) {
      return existing;
    }

    const seed = cloneGameCenterCurationSeed();
    const created = this.curationRepo.create({
      id: 'default',
      featuredGameIdsPayload: seed.featuredGameIds,
      shelvesPayload: seed.shelves,
      hotRankingsPayload: seed.hotRankings,
      newRankingsPayload: seed.newRankings,
      eventsPayload: seed.events,
      storiesPayload: seed.stories,
    });

    return this.curationRepo.save(created);
  }

  private async getKnownGameIdSet() {
    const entries = await this.listCatalogEntities();
    return new Set(entries.map((entry) => entry.id));
  }

  private async ensureOwnerState() {
    const owner = await this.worldOwnerService.getOwnerOrThrow();
    const existing = await this.ownerStateRepo.findOne({
      where: { ownerId: owner.id },
    });

    if (existing) {
      return existing;
    }

    const defaultState = createDefaultGameCenterOwnerState();
    const created = this.ownerStateRepo.create({
      ownerId: owner.id,
      activeGameId: defaultState.activeGameId ?? null,
      recentGameIdsPayload: defaultState.recentGameIds,
      pinnedGameIdsPayload: defaultState.pinnedGameIds,
      launchCountByIdPayload: defaultState.launchCountById,
      lastOpenedAtByIdPayload: defaultState.lastOpenedAtById,
    });

    return this.ownerStateRepo.save(created);
  }

  private normalizeText(value: unknown, fallback: string) {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private normalizeRequiredText(
    value: unknown,
    field: string,
    label: string,
  ) {
    const nextValue = typeof value === 'string' ? value.trim() : '';
    if (!nextValue) {
      throw new BadRequestException(`${label}不能为空 (${field})`);
    }

    return nextValue;
  }

  private normalizeNullableText(value: unknown) {
    if (value == null) {
      return null;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const nextValue = value.trim();
    return nextValue ? nextValue : null;
  }

  private normalizeGameId(value: unknown) {
    const nextValue =
      typeof value === 'string'
        ? value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/^-+|-+$/g, '')
        : '';

    if (!nextValue) {
      throw new BadRequestException('游戏 ID 不能为空');
    }

    return nextValue;
  }

  private normalizeStringArray(value: unknown) {
    if (!Array.isArray(value)) {
      return [] as string[];
    }

    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item): item is string => Boolean(item));
  }

  private ensureKnownGameIds(
    ids: string[],
    knownGameIds: Set<string>,
    label: string,
  ) {
    const missingIds = ids.filter((id) => !knownGameIds.has(id));
    if (missingIds.length > 0) {
      throw new BadRequestException(
        `${label} 包含不存在的游戏 ID：${missingIds.join(', ')}`,
      );
    }
  }

  private normalizeFeaturedGameIds(value: unknown, knownGameIds: Set<string>) {
    const gameIds = Array.from(new Set(this.normalizeStringArray(value)));
    this.ensureKnownGameIds(gameIds, knownGameIds, '主推位');
    return gameIds;
  }

  private normalizeShelves(
    value: UpdateAdminGameCenterCurationInput['shelves'],
    knownGameIds: Set<string>,
  ) {
    if (!Array.isArray(value)) {
      return [] as SerializedGameCenterCuration['shelves'];
    }

    return value.map((shelf, index) => {
      const gameIds = Array.from(
        new Set(this.normalizeStringArray(shelf?.gameIds ?? [])),
      );
      this.ensureKnownGameIds(gameIds, knownGameIds, `货架 ${index + 1}`);

      return {
        id: this.normalizeRequiredText(shelf?.id, `shelves[${index}].id`, '货架 ID'),
        title: this.normalizeRequiredText(
          shelf?.title,
          `shelves[${index}].title`,
          '货架标题',
        ),
        description: this.normalizeText(shelf?.description, ''),
        gameIds,
      };
    });
  }

  private normalizeRankings(
    value:
      | UpdateAdminGameCenterCurationInput['hotRankings']
      | UpdateAdminGameCenterCurationInput['newRankings'],
    knownGameIds: Set<string>,
    label: string,
  ) {
    if (!Array.isArray(value)) {
      return [] as SerializedGameCenterCuration['hotRankings'];
    }

    return value.map((entry, index) => {
      const gameId = this.normalizeRequiredText(
        entry?.gameId,
        `${label}[${index}].gameId`,
        `${label}游戏 ID`,
      );
      this.ensureKnownGameIds([gameId], knownGameIds, label);

      return {
        gameId,
        rank:
          typeof entry?.rank === 'number' && Number.isFinite(entry.rank)
            ? entry.rank
            : index + 1,
        note: this.normalizeText(entry?.note, ''),
      };
    });
  }

  private normalizeEvents(
    value: UpdateAdminGameCenterCurationInput['events'],
    knownGameIds: Set<string>,
  ) {
    if (!Array.isArray(value)) {
      return [] as SerializedGameCenterCuration['events'];
    }

    return value.map((event, index) => {
      const relatedGameId = this.normalizeRequiredText(
        event?.relatedGameId,
        `events[${index}].relatedGameId`,
        '活动关联游戏 ID',
      );
      this.ensureKnownGameIds([relatedGameId], knownGameIds, '活动卡');

      return {
        id: this.normalizeRequiredText(event?.id, `events[${index}].id`, '活动 ID'),
        title: this.normalizeRequiredText(
          event?.title,
          `events[${index}].title`,
          '活动标题',
        ),
        description: this.normalizeText(event?.description, ''),
        meta: this.normalizeText(event?.meta, ''),
        ctaLabel: this.normalizeText(event?.ctaLabel, '立即查看'),
        relatedGameId,
        actionKind: this.normalizeText(event?.actionKind, 'mission') as
          | 'mission'
          | 'reminder'
          | 'join',
        tone: this.normalizeText(event?.tone, 'forest') as
          | 'forest'
          | 'gold'
          | 'ocean'
          | 'violet'
          | 'sunset'
          | 'mint',
      };
    });
  }

  private normalizeStories(
    value: UpdateAdminGameCenterCurationInput['stories'],
    knownGameIds: Set<string>,
  ) {
    if (!Array.isArray(value)) {
      return [] as SerializedGameCenterCuration['stories'];
    }

    return value.map((story, index) => {
      const relatedGameId = this.normalizeNullableText(story?.relatedGameId);
      if (relatedGameId) {
        this.ensureKnownGameIds([relatedGameId], knownGameIds, '内容卡');
      }

      return {
        id: this.normalizeRequiredText(story?.id, `stories[${index}].id`, '内容 ID'),
        title: this.normalizeRequiredText(
          story?.title,
          `stories[${index}].title`,
          '内容标题',
        ),
        description: this.normalizeText(story?.description, ''),
        eyebrow: this.normalizeText(story?.eyebrow, '编辑精选'),
        authorName: this.normalizeText(story?.authorName, '隐界编辑部'),
        ctaLabel: this.normalizeText(story?.ctaLabel, '查看内容'),
        publishedAt: this.normalizeText(
          story?.publishedAt,
          new Date().toISOString(),
        ),
        kind: this.normalizeText(story?.kind, 'spotlight') as
          | 'spotlight'
          | 'guide'
          | 'update'
          | 'behind_the_scenes',
        tone: this.normalizeText(story?.tone, 'forest') as
          | 'forest'
          | 'gold'
          | 'ocean'
          | 'violet'
          | 'sunset'
          | 'mint',
        relatedGameId,
      };
    });
  }

  private sanitizeGameIds(
    value: unknown,
    knownGameIds: Set<string>,
    fallback: string[],
  ) {
    if (!Array.isArray(value)) {
      return [...fallback].filter((item) => knownGameIds.has(item));
    }

    return value.filter(
      (item): item is string =>
        typeof item === 'string' && knownGameIds.has(item),
    );
  }

  private sanitizeLaunchCounts(
    value: unknown,
    knownGameIds: Set<string>,
    fallback: Record<string, number>,
  ) {
    if (!value || typeof value !== 'object') {
      return Object.fromEntries(
        Object.entries(fallback).filter(([key]) => knownGameIds.has(key)),
      );
    }

    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, number] =>
          typeof entry[0] === 'string' &&
          knownGameIds.has(entry[0]) &&
          typeof entry[1] === 'number' &&
          Number.isFinite(entry[1]),
      ),
    );
  }

  private sanitizeTimestamps(
    value: unknown,
    knownGameIds: Set<string>,
    fallback: Record<string, string>,
  ) {
    if (!value || typeof value !== 'object') {
      return Object.fromEntries(
        Object.entries(fallback).filter(([key]) => knownGameIds.has(key)),
      );
    }

    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === 'string' &&
          knownGameIds.has(entry[0]) &&
          typeof entry[1] === 'string',
      ),
    );
  }

  private serializeOwnerState(
    entity: GameOwnerStateEntity,
    knownGameIds: Set<string>,
  ): SerializedGameCenterOwnerState {
    const fallback = createDefaultGameCenterOwnerState();

    return {
      activeGameId:
        entity.activeGameId && knownGameIds.has(entity.activeGameId)
          ? entity.activeGameId
          : null,
      recentGameIds: this.sanitizeGameIds(
        entity.recentGameIdsPayload,
        knownGameIds,
        fallback.recentGameIds,
      ).slice(0, MAX_RECENT_GAMES),
      pinnedGameIds: this.sanitizeGameIds(
        entity.pinnedGameIdsPayload,
        knownGameIds,
        fallback.pinnedGameIds,
      ).slice(0, MAX_PINNED_GAMES),
      launchCountById: this.sanitizeLaunchCounts(
        entity.launchCountByIdPayload,
        knownGameIds,
        fallback.launchCountById,
      ),
      lastOpenedAtById: this.sanitizeTimestamps(
        entity.lastOpenedAtByIdPayload,
        knownGameIds,
        fallback.lastOpenedAtById,
      ),
      updatedAt: entity.updatedAt?.toISOString() ?? fallback.updatedAt,
    };
  }

  private async persistOwnerState(
    entity: GameOwnerStateEntity,
    state: SerializedGameCenterOwnerState,
    knownGameIds: Set<string>,
  ) {
    entity.activeGameId =
      state.activeGameId && knownGameIds.has(state.activeGameId)
        ? state.activeGameId
        : null;
    entity.recentGameIdsPayload = state.recentGameIds
      .filter((id) => knownGameIds.has(id))
      .slice(0, MAX_RECENT_GAMES);
    entity.pinnedGameIdsPayload = state.pinnedGameIds
      .filter((id) => knownGameIds.has(id))
      .slice(0, MAX_PINNED_GAMES);
    entity.launchCountByIdPayload = Object.fromEntries(
      Object.entries(state.launchCountById).filter(([key]) => knownGameIds.has(key)),
    );
    entity.lastOpenedAtByIdPayload = Object.fromEntries(
      Object.entries(state.lastOpenedAtById).filter(([key]) => knownGameIds.has(key)),
    );

    const saved = await this.ownerStateRepo.save(entity);
    return this.serializeOwnerState(saved, knownGameIds);
  }

  private serializeGameCenterCuration(
    entity: GameCenterCurationEntity,
    knownGameIds: Set<string>,
  ): SerializedGameCenterCuration {
    const fallback = cloneGameCenterCurationSeed();

    return {
      featuredGameIds: this.sanitizeGameIds(
        entity.featuredGameIdsPayload,
        knownGameIds,
        fallback.featuredGameIds,
      ),
      shelves: (Array.isArray(entity.shelvesPayload)
        ? entity.shelvesPayload
        : fallback.shelves
      )
        .map((shelf) => ({
          id: typeof shelf?.id === 'string' ? shelf.id : '',
          title: typeof shelf?.title === 'string' ? shelf.title : '',
          description: typeof shelf?.description === 'string' ? shelf.description : '',
          gameIds: this.sanitizeGameIds(
            shelf?.gameIds,
            knownGameIds,
            [],
          ),
        }))
        .filter((shelf) => shelf.id && shelf.title && shelf.gameIds.length > 0),
      hotRankings: (Array.isArray(entity.hotRankingsPayload)
        ? entity.hotRankingsPayload
        : fallback.hotRankings
      ).filter(
        (entry): entry is { gameId: string; rank: number; note: string } =>
          typeof entry?.gameId === 'string' &&
          knownGameIds.has(entry.gameId) &&
          typeof entry.rank === 'number' &&
          Number.isFinite(entry.rank),
      ),
      newRankings: (Array.isArray(entity.newRankingsPayload)
        ? entity.newRankingsPayload
        : fallback.newRankings
      ).filter(
        (entry): entry is { gameId: string; rank: number; note: string } =>
          typeof entry?.gameId === 'string' &&
          knownGameIds.has(entry.gameId) &&
          typeof entry.rank === 'number' &&
          Number.isFinite(entry.rank),
      ),
      events: (Array.isArray(entity.eventsPayload)
        ? entity.eventsPayload
        : fallback.events
      ).filter(
        (event): event is SerializedGameCenterCuration['events'][number] =>
          typeof event?.id === 'string' &&
          typeof event.title === 'string' &&
          typeof event.relatedGameId === 'string' &&
          knownGameIds.has(event.relatedGameId),
      ),
      stories: (Array.isArray(entity.storiesPayload)
        ? entity.storiesPayload
        : fallback.stories
      ).filter(
        (story): story is SerializedGameCenterCuration['stories'][number] =>
          typeof story?.id === 'string' &&
          typeof story.title === 'string' &&
          (!story.relatedGameId || knownGameIds.has(story.relatedGameId)),
      ),
      updatedAt: entity.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  private async persistGameCenterCuration(
    entity: GameCenterCurationEntity,
    state: SerializedGameCenterCuration,
    knownGameIds: Set<string>,
  ) {
    entity.featuredGameIdsPayload = state.featuredGameIds;
    entity.shelvesPayload = state.shelves;
    entity.hotRankingsPayload = state.hotRankings;
    entity.newRankingsPayload = state.newRankings;
    entity.eventsPayload = state.events;
    entity.storiesPayload = state.stories;

    const saved = await this.curationRepo.save(entity);
    return this.serializeGameCenterCuration(saved, knownGameIds);
  }

  private serializeGame(entry: GameCatalogEntity) {
    return {
      id: entry.id,
      name: entry.name,
      slogan: entry.slogan,
      description: entry.description,
      studio: entry.studio,
      badge: entry.badge,
      heroLabel: entry.heroLabel,
      category: entry.category as
        | 'featured'
        | 'party'
        | 'competitive'
        | 'relax'
        | 'strategy',
      tone: entry.tone as
        | 'forest'
        | 'gold'
        | 'ocean'
        | 'violet'
        | 'sunset'
        | 'mint',
      playersLabel: entry.playersLabel,
      friendsLabel: entry.friendsLabel,
      updateNote: entry.updateNote,
      deckLabel: entry.deckLabel,
      estimatedDuration: entry.estimatedDuration,
      rewardLabel: entry.rewardLabel,
      sessionObjective: entry.sessionObjective,
      tags: [...entry.tagsPayload],
      publisherKind: entry.publisherKind as
        | 'platform_official'
        | 'third_party'
        | 'character_creator',
      productionKind: entry.productionKind as
        | 'human_authored'
        | 'ai_assisted'
        | 'ai_generated'
        | 'character_generated',
      runtimeMode: entry.runtimeMode as
        | 'workspace_mock'
        | 'chat_native'
        | 'embedded_web'
        | 'remote_session',
      reviewStatus: entry.reviewStatus as
        | 'internal_seed'
        | 'pending_review'
        | 'approved'
        | 'rejected'
        | 'suspended',
      visibilityScope: entry.visibilityScope as
        | 'featured'
        | 'published'
        | 'coming_soon'
        | 'internal',
      sourceCharacterId: entry.sourceCharacterId ?? null,
      sourceCharacterName: entry.sourceCharacterName ?? null,
      aiHighlights: [...entry.aiHighlightsPayload],
    };
  }

  private serializeAdminCatalogItem(entry: GameCatalogEntity) {
    return {
      ...this.serializeGame(entry),
      sortOrder: entry.sortOrder,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }

  private async getNextSortOrder() {
    await this.ensureCatalogSeeded();
    const latest = await this.catalogRepo.find({
      order: { sortOrder: 'DESC', createdAt: 'DESC' },
      take: 1,
    });

    return (latest[0]?.sortOrder ?? 0) + 1;
  }
}
