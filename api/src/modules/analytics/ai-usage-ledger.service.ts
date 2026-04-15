import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, Repository } from 'typeorm';
import { AiUsageLedgerEntity } from './ai-usage-ledger.entity';
import { SystemConfigService } from '../config/config.service';
import { CharacterEntity } from '../characters/character.entity';
import { ConversationEntity } from '../chat/conversation.entity';
import { GroupEntity } from '../chat/group.entity';

type PricingCurrency = 'CNY' | 'USD';
type LedgerStatus = 'success' | 'failed';
type LedgerSurface = 'app' | 'admin' | 'scheduler' | 'system';
type LedgerBillingSource = 'owner_custom' | 'instance_default';
type LedgerScopeType =
  | 'character'
  | 'conversation'
  | 'group'
  | 'world'
  | 'admin_task';
type LedgerGrain = 'day' | 'week' | 'month';

type TokenPricingCatalogItem = {
  model: string;
  inputPer1kTokens: number;
  outputPer1kTokens: number;
  enabled: boolean;
  note?: string;
};

type TokenPricingCatalog = {
  currency: PricingCurrency;
  items: TokenPricingCatalogItem[];
};

type UsageMetrics = {
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  raw?: Record<string, unknown> | null;
};

export type AiUsageRecordInput = {
  occurredAt?: Date;
  requestId?: string | null;
  status: LedgerStatus;
  surface: LedgerSurface;
  scene: string;
  scopeType: LedgerScopeType;
  scopeId?: string | null;
  scopeLabel?: string | null;
  ownerId?: string | null;
  characterId?: string | null;
  characterName?: string | null;
  conversationId?: string | null;
  groupId?: string | null;
  providerKey?: string | null;
  providerMode?: string | null;
  model?: string | null;
  apiStyle?: string | null;
  billingSource?: LedgerBillingSource | null;
  usage?: UsageMetrics | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

type TokenUsageQuery = {
  from?: string;
  to?: string;
  grain?: string;
  characterId?: string;
  conversationId?: string;
  groupId?: string;
  scene?: string;
  model?: string;
  billingSource?: string;
  status?: string;
  page?: number | string;
  pageSize?: number | string;
  limit?: number | string;
};

type NormalizedTokenUsageQuery = {
  from: Date;
  to: Date;
  grain: LedgerGrain;
  characterId?: string;
  conversationId?: string;
  groupId?: string;
  scene?: string;
  model?: string;
  billingSource?: LedgerBillingSource;
  status?: LedgerStatus;
  page: number;
  pageSize: number;
  limit: number;
};

type AggregateBucket = {
  key: string;
  label: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  requestCount: number;
  successCount: number;
  failedCount: number;
};

const PRICING_CONFIG_KEY = 'token_pricing_catalog';
const PRICING_CACHE_TTL_MS = 10_000;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AiUsageLedgerService {
  private pricingCache:
    | {
        expiresAt: number;
        value: TokenPricingCatalog;
      }
    | null = null;

  constructor(
    @InjectRepository(AiUsageLedgerEntity)
    private readonly repo: Repository<AiUsageLedgerEntity>,
    @InjectRepository(CharacterEntity)
    private readonly characterRepo: Repository<CharacterEntity>,
    @InjectRepository(ConversationEntity)
    private readonly conversationRepo: Repository<ConversationEntity>,
    @InjectRepository(GroupEntity)
    private readonly groupRepo: Repository<GroupEntity>,
    private readonly systemConfig: SystemConfigService,
  ) {}

  async record(input: AiUsageRecordInput) {
    const catalog = await this.getPricingCatalog();
    const pricing = this.findPricingItem(catalog, input.model);
    const promptTokens = this.normalizeInteger(input.usage?.promptTokens);
    const completionTokens = this.normalizeInteger(input.usage?.completionTokens);
    const totalTokens = this.normalizeInteger(
      input.usage?.totalTokens ??
        ((promptTokens ?? 0) || (completionTokens ?? 0)
          ? (promptTokens ?? 0) + (completionTokens ?? 0)
          : null),
    );
    const estimatedCost = this.roundCost(
      ((promptTokens ?? 0) / 1000) * (pricing?.inputPer1kTokens ?? 0) +
        ((completionTokens ?? 0) / 1000) * (pricing?.outputPer1kTokens ?? 0),
    );

    const entity = this.repo.create({
      occurredAt: input.occurredAt ?? new Date(),
      requestId: input.requestId ?? null,
      status: input.status,
      surface: input.surface,
      scene: input.scene,
      scopeType: input.scopeType,
      scopeId: input.scopeId ?? null,
      scopeLabel: input.scopeLabel ?? null,
      ownerId: input.ownerId ?? null,
      characterId: input.characterId ?? null,
      characterName: input.characterName ?? null,
      conversationId: input.conversationId ?? null,
      groupId: input.groupId ?? null,
      providerKey: input.providerKey ?? null,
      providerMode: input.providerMode ?? null,
      model: input.model ?? null,
      apiStyle: input.apiStyle ?? null,
      billingSource: input.billingSource ?? null,
      promptTokens,
      completionTokens,
      totalTokens,
      inputUnitPrice: pricing?.inputPer1kTokens ?? null,
      outputUnitPrice: pricing?.outputPer1kTokens ?? null,
      estimatedCost,
      currency: catalog.currency,
      rawUsagePayload: input.usage?.raw
        ? JSON.stringify(input.usage.raw)
        : null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage
        ? input.errorMessage.slice(0, 1000)
        : null,
    });

    return this.repo.save(entity);
  }

  async getPricingCatalog(): Promise<TokenPricingCatalog> {
    if (
      this.pricingCache &&
      this.pricingCache.expiresAt > Date.now()
    ) {
      return this.pricingCache.value;
    }

    const raw = await this.systemConfig.getConfig(PRICING_CONFIG_KEY);
    const parsed = this.parsePricingCatalog(raw);
    this.pricingCache = {
      expiresAt: Date.now() + PRICING_CACHE_TTL_MS,
      value: parsed,
    };
    return parsed;
  }

  async setPricingCatalog(payload: TokenPricingCatalog) {
    const normalized = this.normalizePricingCatalog(payload);
    await this.systemConfig.setConfig(
      PRICING_CONFIG_KEY,
      JSON.stringify(normalized),
    );
    this.pricingCache = {
      expiresAt: Date.now() + PRICING_CACHE_TTL_MS,
      value: normalized,
    };
    return normalized;
  }

  async getOverview(query: TokenUsageQuery) {
    const normalized = this.normalizeQuery(query);
    const records = await this.repo.find({
      where: this.buildWhere(normalized),
      order: { occurredAt: 'DESC' },
    });
    const currency = records[0]?.currency ?? (await this.getPricingCatalog()).currency;
    const activeCharacterCount = new Set(
      records
        .map((record) => record.characterId)
        .filter((value): value is string => Boolean(value)),
    ).size;

    return {
      currency,
      promptTokens: this.sum(records, 'promptTokens'),
      completionTokens: this.sum(records, 'completionTokens'),
      totalTokens: this.sum(records, 'totalTokens'),
      estimatedCost: this.roundCost(this.sum(records, 'estimatedCost')),
      requestCount: records.length,
      successCount: records.filter((record) => record.status === 'success').length,
      failedCount: records.filter((record) => record.status === 'failed').length,
      activeCharacterCount,
    };
  }

  async getTrend(query: TokenUsageQuery) {
    const normalized = this.normalizeQuery(query);
    const records = await this.repo.find({
      where: this.buildWhere(normalized),
      order: { occurredAt: 'ASC' },
    });
    const bucketMap = new Map<string, AggregateBucket>();

    records.forEach((record) => {
      const bucketStart = this.toBucketStart(record.occurredAt, normalized.grain);
      const key = bucketStart.toISOString();
      const bucket = this.ensureBucket(
        bucketMap,
        key,
        this.formatBucketLabel(bucketStart, normalized.grain),
      );
      this.accumulateBucket(bucket, record);
    });

    return Array.from(bucketMap.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([key, bucket]) => ({
        bucketStart: key,
        label: bucket.label,
        promptTokens: bucket.promptTokens,
        completionTokens: bucket.completionTokens,
        totalTokens: bucket.totalTokens,
        estimatedCost: this.roundCost(bucket.estimatedCost),
        requestCount: bucket.requestCount,
        successCount: bucket.successCount,
        failedCount: bucket.failedCount,
      }));
  }

  async getBreakdown(query: TokenUsageQuery) {
    const normalized = this.normalizeQuery(query);
    const records = await this.repo.find({
      where: this.buildWhere(normalized),
      order: { occurredAt: 'DESC' },
    });
    const currency = records[0]?.currency ?? (await this.getPricingCatalog()).currency;

    return {
      currency,
      byCharacter: this.groupBy(records, normalized.limit, (record) => ({
        key: record.characterId ?? '__unknown__',
        label:
          record.characterName?.trim() ||
          record.scopeLabel?.trim() ||
          record.characterId ||
          '未识别角色',
      })),
      byConversation: this.groupBy(records, normalized.limit, (record) => ({
        key:
          record.conversationId ??
          record.groupId ??
          record.scopeId ??
          '__unknown__',
        label:
          record.scopeLabel?.trim() ||
          record.characterName?.trim() ||
          record.conversationId ||
          record.groupId ||
          record.scopeId ||
          '未识别对象',
      })),
      byScene: this.groupBy(records, normalized.limit, (record) => ({
        key: record.scene,
        label: this.formatSceneLabel(record.scene),
      })),
      byModel: this.groupBy(records, normalized.limit, (record) => ({
        key: record.model?.trim() || '__unknown__',
        label: record.model?.trim() || '未记录模型',
      })),
      byBillingSource: this.groupBy(records, normalized.limit, (record) => ({
        key: record.billingSource?.trim() || '__unknown__',
        label:
          record.billingSource === 'owner_custom'
            ? '世界主人 Key'
            : record.billingSource === 'instance_default'
              ? '实例默认 Key'
              : '未记录来源',
      })),
    };
  }

  async getRecords(query: TokenUsageQuery) {
    const normalized = this.normalizeQuery(query);
    const where = this.buildWhere(normalized);
    const [total, records] = await Promise.all([
      this.repo.count({ where }),
      this.repo.find({
        where,
        order: { occurredAt: 'DESC' },
        skip: (normalized.page - 1) * normalized.pageSize,
        take: normalized.pageSize,
      }),
    ]);

    const labelMaps = await this.buildLabelMaps(records);

    return {
      items: records.map((record) => ({
        id: record.id,
        occurredAt: record.occurredAt.toISOString(),
        status: record.status as LedgerStatus,
        surface: record.surface as LedgerSurface,
        scene: record.scene,
        scopeType: record.scopeType as LedgerScopeType,
        scopeId: record.scopeId ?? null,
        targetLabel: this.resolveTargetLabel(record, labelMaps),
        characterId: record.characterId ?? null,
        characterName: record.characterName ?? null,
        conversationId: record.conversationId ?? null,
        groupId: record.groupId ?? null,
        model: record.model ?? null,
        billingSource:
          (record.billingSource as LedgerBillingSource | null) ?? null,
        promptTokens: record.promptTokens ?? 0,
        completionTokens: record.completionTokens ?? 0,
        totalTokens: record.totalTokens ?? 0,
        estimatedCost: this.roundCost(record.estimatedCost ?? 0),
        currency: (record.currency as PricingCurrency) ?? 'CNY',
        errorCode: record.errorCode ?? null,
        errorMessage: record.errorMessage ?? null,
      })),
      total,
      page: normalized.page,
      pageSize: normalized.pageSize,
      totalPages: Math.max(1, Math.ceil(total / normalized.pageSize)),
    };
  }

  private normalizeQuery(query: TokenUsageQuery): NormalizedTokenUsageQuery {
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 6 * DAY_MS);
    defaultFrom.setHours(0, 0, 0, 0);

    const from = this.parseDate(query.from, defaultFrom, false);
    const to = this.parseDate(query.to, now, true);
    if (to < from) {
      return {
        ...this.normalizeQuery({
          ...query,
          from: query.to,
          to: query.from,
        }),
      };
    }

    const grain =
      query.grain === 'week' || query.grain === 'month'
        ? query.grain
        : 'day';
    const page = this.normalizePositiveInteger(query.page, 1);
    const pageSize = Math.min(
      100,
      Math.max(1, this.normalizePositiveInteger(query.pageSize, 20)),
    );
    const limit = Math.min(
      20,
      Math.max(1, this.normalizePositiveInteger(query.limit, 8)),
    );

    return {
      from,
      to,
      grain,
      characterId: this.normalizeString(query.characterId),
      conversationId: this.normalizeString(query.conversationId),
      groupId: this.normalizeString(query.groupId),
      scene: this.normalizeString(query.scene),
      model: this.normalizeString(query.model),
      billingSource: this.normalizeBillingSource(query.billingSource),
      status: this.normalizeStatus(query.status),
      page,
      pageSize,
      limit,
    };
  }

  private buildWhere(
    query: NormalizedTokenUsageQuery,
  ): FindOptionsWhere<AiUsageLedgerEntity> {
    const where: FindOptionsWhere<AiUsageLedgerEntity> = {
      occurredAt: Between(query.from, query.to),
    };

    if (query.characterId) {
      where.characterId = query.characterId;
    }
    if (query.conversationId) {
      where.conversationId = query.conversationId;
    }
    if (query.groupId) {
      where.groupId = query.groupId;
    }
    if (query.scene) {
      where.scene = query.scene;
    }
    if (query.model) {
      where.model = query.model;
    }
    if (query.billingSource) {
      where.billingSource = query.billingSource;
    }
    if (query.status) {
      where.status = query.status;
    }

    return where;
  }

  private parsePricingCatalog(raw: string | null): TokenPricingCatalog {
    if (!raw?.trim()) {
      return this.normalizePricingCatalog(undefined);
    }

    try {
      return this.normalizePricingCatalog(
        JSON.parse(raw) as TokenPricingCatalog,
      );
    } catch {
      return this.normalizePricingCatalog(undefined);
    }
  }

  private normalizePricingCatalog(payload?: Partial<TokenPricingCatalog> | null) {
    const currency: PricingCurrency =
      payload?.currency === 'USD' ? 'USD' : 'CNY';
    const items = Array.isArray(payload?.items)
      ? payload.items
          .map((item) => this.normalizePricingItem(item))
          .filter(
            (item): item is TokenPricingCatalogItem => item !== null,
          )
      : [];

    return {
      currency,
      items,
    };
  }

  private normalizePricingItem(
    item?: Partial<TokenPricingCatalogItem> | null,
  ): TokenPricingCatalogItem | null {
    const model = item?.model?.trim();
    if (!model) {
      return null;
    }

    return {
      model,
      inputPer1kTokens: this.normalizeNonNegativeNumber(item?.inputPer1kTokens),
      outputPer1kTokens: this.normalizeNonNegativeNumber(
        item?.outputPer1kTokens,
      ),
      enabled: item?.enabled !== false,
      note: item?.note?.trim() || undefined,
    };
  }

  private findPricingItem(
    catalog: TokenPricingCatalog,
    model?: string | null,
  ) {
    if (!model?.trim()) {
      return null;
    }

    const normalizedModel = model.trim().toLowerCase();
    return (
      catalog.items.find(
        (item) => item.enabled && item.model.trim().toLowerCase() === normalizedModel,
      ) ?? null
    );
  }

  private parseDate(value: string | undefined, fallback: Date, endOfDay: boolean) {
    if (!value?.trim()) {
      return new Date(fallback);
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date(fallback);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      parsed.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    }

    return parsed;
  }

  private normalizePositiveInteger(value: number | string | undefined, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return Math.floor(parsed);
  }

  private normalizeInteger(value: number | null | undefined) {
    if (value == null || !Number.isFinite(value)) {
      return null;
    }
    return Math.max(0, Math.round(value));
  }

  private normalizeNonNegativeNumber(value: number | null | undefined) {
    if (value == null || !Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Number(value));
  }

  private normalizeString(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private normalizeStatus(value?: string | null): LedgerStatus | undefined {
    return value === 'failed' || value === 'success' ? value : undefined;
  }

  private normalizeBillingSource(
    value?: string | null,
  ): LedgerBillingSource | undefined {
    return value === 'owner_custom' || value === 'instance_default'
      ? value
      : undefined;
  }

  private toBucketStart(date: Date, grain: LedgerGrain) {
    const bucket = new Date(date);
    if (grain === 'month') {
      bucket.setUTCDate(1);
      bucket.setUTCHours(0, 0, 0, 0);
      return bucket;
    }
    if (grain === 'week') {
      const day = bucket.getUTCDay() || 7;
      bucket.setUTCDate(bucket.getUTCDate() - day + 1);
      bucket.setUTCHours(0, 0, 0, 0);
      return bucket;
    }
    bucket.setUTCHours(0, 0, 0, 0);
    return bucket;
  }

  private formatBucketLabel(date: Date, grain: LedgerGrain) {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${date.getUTCDate()}`.padStart(2, '0');

    if (grain === 'month') {
      return `${year}-${month}`;
    }
    return `${year}-${month}-${day}`;
  }

  private ensureBucket(
    bucketMap: Map<string, AggregateBucket>,
    key: string,
    label: string,
  ) {
    let bucket = bucketMap.get(key);
    if (!bucket) {
      bucket = {
        key,
        label,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        requestCount: 0,
        successCount: 0,
        failedCount: 0,
      };
      bucketMap.set(key, bucket);
    }
    return bucket;
  }

  private accumulateBucket(
    bucket: AggregateBucket,
    record: AiUsageLedgerEntity,
  ) {
    bucket.promptTokens += record.promptTokens ?? 0;
    bucket.completionTokens += record.completionTokens ?? 0;
    bucket.totalTokens += record.totalTokens ?? 0;
    bucket.estimatedCost += record.estimatedCost ?? 0;
    bucket.requestCount += 1;
    if (record.status === 'success') {
      bucket.successCount += 1;
    } else {
      bucket.failedCount += 1;
    }
  }

  private groupBy(
    records: AiUsageLedgerEntity[],
    limit: number,
    pick: (
      record: AiUsageLedgerEntity,
    ) => { key: string; label: string },
  ) {
    const buckets = new Map<string, AggregateBucket>();

    records.forEach((record) => {
      const descriptor = pick(record);
      const bucket = this.ensureBucket(buckets, descriptor.key, descriptor.label);
      this.accumulateBucket(bucket, record);
    });

    return Array.from(buckets.values())
      .sort((left, right) => {
        if (right.totalTokens !== left.totalTokens) {
          return right.totalTokens - left.totalTokens;
        }
        if (right.estimatedCost !== left.estimatedCost) {
          return right.estimatedCost - left.estimatedCost;
        }
        return right.requestCount - left.requestCount;
      })
      .slice(0, limit)
      .map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        promptTokens: bucket.promptTokens,
        completionTokens: bucket.completionTokens,
        totalTokens: bucket.totalTokens,
        estimatedCost: this.roundCost(bucket.estimatedCost),
        requestCount: bucket.requestCount,
        successCount: bucket.successCount,
        failedCount: bucket.failedCount,
      }));
  }

  private sum(
    records: AiUsageLedgerEntity[],
    field: 'promptTokens' | 'completionTokens' | 'totalTokens' | 'estimatedCost',
  ) {
    return records.reduce((total, record) => total + (record[field] ?? 0), 0);
  }

  private roundCost(value: number) {
    return Math.round((value + Number.EPSILON) * 10000) / 10000;
  }

  private formatSceneLabel(scene: string) {
    const sceneMap: Record<string, string> = {
      chat_reply: '单聊回复',
      group_reply: '群聊回复',
      moment_post_generate: '朋友圈生成',
      moment_comment_generate: '朋友圈评论生成',
      feed_post_generate: '广场动态生成',
      feed_comment_generate: '动态评论生成',
      channel_post_generate: '视频号生成',
      social_greeting_generate: '社交问候生成',
      memory_compress: '记忆压缩',
      character_factory_extract: '角色工厂抽取',
      quick_character_generate: '快速生成角色',
      intent_classify: '意图分类',
    };

    return sceneMap[scene] ?? scene;
  }

  private async buildLabelMaps(records: AiUsageLedgerEntity[]) {
    const conversationIds = Array.from(
      new Set(
        records
          .map((record) => record.conversationId)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const groupIds = Array.from(
      new Set(
        records
          .map((record) => record.groupId)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const characterIds = Array.from(
      new Set(
        records
          .map((record) => record.characterId)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const [conversations, groups, characters] = await Promise.all([
      conversationIds.length
        ? this.conversationRepo.find({
            where: { id: In(conversationIds) },
          })
        : Promise.resolve([]),
      groupIds.length
        ? this.groupRepo.find({
            where: { id: In(groupIds) },
          })
        : Promise.resolve([]),
      characterIds.length
        ? this.characterRepo.find({
            where: { id: In(characterIds) },
          })
        : Promise.resolve([]),
    ]);

    return {
      conversationMap: new Map(conversations.map((item) => [item.id, item.title])),
      groupMap: new Map(groups.map((item) => [item.id, item.name])),
      characterMap: new Map(characters.map((item) => [item.id, item.name])),
    };
  }

  private resolveTargetLabel(
    record: AiUsageLedgerEntity,
    labelMaps: {
      conversationMap: Map<string, string>;
      groupMap: Map<string, string>;
      characterMap: Map<string, string>;
    },
  ) {
    if (record.scopeLabel?.trim()) {
      return record.scopeLabel.trim();
    }
    if (record.conversationId && labelMaps.conversationMap.has(record.conversationId)) {
      return labelMaps.conversationMap.get(record.conversationId) as string;
    }
    if (record.groupId && labelMaps.groupMap.has(record.groupId)) {
      return labelMaps.groupMap.get(record.groupId) as string;
    }
    if (record.characterName?.trim()) {
      return record.characterName.trim();
    }
    if (record.characterId && labelMaps.characterMap.has(record.characterId)) {
      return labelMaps.characterMap.get(record.characterId) as string;
    }
    return record.scopeId || record.characterId || record.groupId || '未识别对象';
  }
}
