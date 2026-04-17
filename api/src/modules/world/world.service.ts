import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfigService } from '../config/config.service';
import {
  DEFAULT_REPLY_LOGIC_RUNTIME_RULES,
  REPLY_LOGIC_RUNTIME_RULES_CONFIG_KEY,
  normalizeReplyLogicRuntimeRules,
  type ReplyLogicRuntimeRules,
} from '../ai/reply-logic.constants';
import { WorldContextEntity } from './world-context.entity';

const WORLD_RUNTIME_LOCATION_CONFIG_KEY = 'world_runtime_location';
const WORLD_CONTEXT_MAX_AGE_MS = 20 * 60 * 1000;
const WORLD_LOCATION_CACHE_TTL_MS = 60 * 1000;
const WORLD_LOCATION_REFRESH_TTL_MS = 6 * 60 * 60 * 1000;

const DEFAULT_WORLD_LOCATION = Object.freeze({
  source: 'default' as const,
  sourceIp: null,
  country: '中国',
  region: '浙江',
  city: '杭州',
  latitude: 30.2741,
  longitude: 120.1551,
  timezone: 'Asia/Shanghai',
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

type WorldResolvedLocation = {
  source: 'default' | 'ip';
  sourceIp: string | null;
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  resolvedAt: string;
};

type WorldCalendar = {
  location: WorldResolvedLocation;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
  dateTimeText: string;
  timeText: string;
  displayLocation: string;
};

type IpWhoIsResponse = {
  success?: boolean;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: {
    id?: string;
  };
};

type OpenMeteoCurrentResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    is_day?: number;
  };
};

function renderTemplate(
  template: string,
  variables: Record<string, string | undefined | null>,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    variables[key] == null ? '' : String(variables[key]),
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

@Injectable()
export class WorldService {
  private readonly logger = new Logger(WorldService.name);
  private locationCache: WorldResolvedLocation | null = null;
  private locationCacheExpiresAt = 0;
  private locationRefreshPromise: Promise<void> | null = null;

  constructor(
    @InjectRepository(WorldContextEntity)
    private repo: Repository<WorldContextEntity>,
    private readonly systemConfig: SystemConfigService,
  ) {}

  async snapshot(): Promise<WorldContextEntity> {
    const snapshot = await this.createSnapshot();
    return this.repo.save(this.repo.create(snapshot));
  }

  async createSnapshot(): Promise<Partial<WorldContextEntity>> {
    const runtimeRules = await this.getRuntimeRules();
    const worldCalendar = await this.getWorldCalendar();
    const timeOfDay = this.resolveTimeOfDayLabel(
      worldCalendar.hour,
      runtimeRules,
    );
    const season = this.resolveSeasonLabel(worldCalendar.month, runtimeRules);

    return {
      localTime: renderTemplate(
        runtimeRules.worldContextRules.localTimeTemplate,
        {
          timeOfDay,
          hour: String(worldCalendar.hour),
          minute: String(worldCalendar.minute).padStart(2, '0'),
        },
      ),
      season,
      weather: await this.getLiveWeather(
        worldCalendar.location,
        season,
        worldCalendar.hour,
        runtimeRules,
      ),
      location: worldCalendar.displayLocation,
      holiday: this.getHoliday(
        worldCalendar.month,
        worldCalendar.day,
        runtimeRules,
      ),
    };
  }

  async getLatest(): Promise<WorldContextEntity | null> {
    const latest = await this.repo.findOne({
      where: {},
      order: { timestamp: 'DESC' },
    });

    const currentLocation = await this.getResolvedLocation();
    const expectedLocation = this.buildLocationLabel(currentLocation);
    const isStale =
      !latest ||
      !latest.localTime?.trim() ||
      !latest.weather?.trim() ||
      !latest.location?.trim() ||
      latest.location.trim() !== expectedLocation ||
      Date.now() - latest.timestamp.getTime() > WORLD_CONTEXT_MAX_AGE_MS;

    if (isStale) {
      return this.snapshot();
    }

    return latest;
  }

  async buildContextString(ctx: WorldContextEntity | null): Promise<string> {
    if (!ctx) {
      return '';
    }

    const runtimeRules = await this.getRuntimeRules();
    const parts: string[] = [
      renderTemplate(
        runtimeRules.worldContextRules.contextFieldTemplates.currentTime,
        {
          localTime: ctx.localTime,
        },
      ),
    ];

    if (ctx.season) {
      parts.push(
        renderTemplate(
          runtimeRules.worldContextRules.contextFieldTemplates.season,
          {
            season: ctx.season,
          },
        ),
      );
    }
    if (ctx.weather) {
      parts.push(
        renderTemplate(
          runtimeRules.worldContextRules.contextFieldTemplates.weather,
          {
            weather: ctx.weather,
          },
        ),
      );
    }
    if (ctx.location) {
      parts.push(
        renderTemplate(
          runtimeRules.worldContextRules.contextFieldTemplates.location,
          {
            location: ctx.location,
          },
        ),
      );
    }
    if (ctx.holiday) {
      parts.push(
        renderTemplate(
          runtimeRules.worldContextRules.contextFieldTemplates.holiday,
          {
            holiday: ctx.holiday,
          },
        ),
      );
    }

    return parts.join(runtimeRules.worldContextRules.contextSeparator);
  }

  async buildPromptContextBlock(
    ctx: WorldContextEntity | null,
  ): Promise<string> {
    const context = await this.buildContextString(ctx);
    if (!context) {
      return '';
    }

    const runtimeRules = await this.getRuntimeRules();
    return renderTemplate(
      runtimeRules.worldContextRules.promptContextTemplate,
      {
        context,
      },
    );
  }

  async getCurrentTimeReplacementPattern(): Promise<RegExp | null> {
    const runtimeRules = await this.getRuntimeRules();
    const template =
      runtimeRules.worldContextRules.contextFieldTemplates.currentTime;
    const placeholderIndex = template.indexOf('{{');
    const prefix = (
      placeholderIndex >= 0 ? template.slice(0, placeholderIndex) : template
    ).trim();
    if (!prefix) {
      return null;
    }

    return new RegExp(`${escapeRegExp(prefix)}[^\\n]*`);
  }

  async syncRequestLocation(request?: Request | null): Promise<void> {
    const sourceIp = this.extractClientIp(request);
    const currentLocation = await this.getResolvedLocation();

    if (!sourceIp || this.isPrivateIp(sourceIp)) {
      return;
    }

    const locationFresh =
      currentLocation.sourceIp === sourceIp &&
      Date.now() - Date.parse(currentLocation.resolvedAt) <
        WORLD_LOCATION_REFRESH_TTL_MS;
    if (locationFresh) {
      return;
    }

    if (this.locationRefreshPromise) {
      await this.locationRefreshPromise;
      return;
    }

    const refreshPromise = this.refreshLocationFromIp(
      sourceIp,
      currentLocation,
    );
    this.locationRefreshPromise = refreshPromise;
    try {
      await refreshPromise;
    } finally {
      if (this.locationRefreshPromise === refreshPromise) {
        this.locationRefreshPromise = null;
      }
    }
  }

  async getWorldCalendar(referenceTime = new Date()): Promise<WorldCalendar> {
    const location = await this.getResolvedLocation();
    const dateTimeParts = this.formatDateParts(
      referenceTime,
      location.timezone,
    );
    const weekdayKey = new Intl.DateTimeFormat('en-US', {
      timeZone: location.timezone,
      weekday: 'short',
    }).format(referenceTime);

    return {
      location,
      year: Number(dateTimeParts.year),
      month: Number(dateTimeParts.month),
      day: Number(dateTimeParts.day),
      hour: Number(dateTimeParts.hour),
      minute: Number(dateTimeParts.minute),
      weekday: WEEKDAY_INDEX[weekdayKey] ?? referenceTime.getUTCDay(),
      dateTimeText: new Intl.DateTimeFormat('zh-CN', {
        timeZone: location.timezone,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(referenceTime),
      timeText: new Intl.DateTimeFormat('zh-CN', {
        timeZone: location.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(referenceTime),
      displayLocation: this.buildLocationLabel(location),
    };
  }

  private async getRuntimeRules() {
    const raw = await this.systemConfig.getConfig(
      REPLY_LOGIC_RUNTIME_RULES_CONFIG_KEY,
    );
    if (!raw) {
      return DEFAULT_REPLY_LOGIC_RUNTIME_RULES;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ReplyLogicRuntimeRules>;
      return normalizeReplyLogicRuntimeRules(parsed);
    } catch {
      this.logger.warn(
        `Failed to parse ${REPLY_LOGIC_RUNTIME_RULES_CONFIG_KEY}, using defaults.`,
      );
      return DEFAULT_REPLY_LOGIC_RUNTIME_RULES;
    }
  }

  private getHoliday(
    month: number,
    day: number,
    runtimeRules: Awaited<ReturnType<WorldService['getRuntimeRules']>>,
  ): string | undefined {
    return runtimeRules.worldContextRules.holidays.find(
      (item) => item.month === month && item.day === day,
    )?.label;
  }

  private async getLiveWeather(
    location: WorldResolvedLocation,
    season: string,
    hour: number,
    runtimeRules: Awaited<ReturnType<WorldService['getRuntimeRules']>>,
  ): Promise<string> {
    try {
      const search = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current: 'temperature_2m,weather_code,is_day',
        timezone: location.timezone,
      });
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${search.toString()}`,
        { signal: AbortSignal.timeout(3000) },
      );

      if (!response.ok) {
        throw new Error(`weather response ${response.status}`);
      }

      const payload = (await response.json()) as OpenMeteoCurrentResponse;
      const current = payload.current;
      if (!current) {
        throw new Error('weather payload missing current data');
      }

      const label = this.mapWeatherCodeToLabel(
        current.weather_code,
        current.is_day,
      );
      const temperature =
        typeof current.temperature_2m === 'number' &&
        Number.isFinite(current.temperature_2m)
          ? `${Math.round(current.temperature_2m)}°C`
          : '';

      return [label, temperature].filter(Boolean).join(' ');
    } catch (error) {
      this.logger.warn(
        `Failed to fetch live weather for ${location.timezone}, falling back to seasonal preset.`,
      );
      return this.getFallbackWeather(season, hour, runtimeRules);
    }
  }

  private getFallbackWeather(
    season: string,
    hour: number,
    runtimeRules: Awaited<ReturnType<WorldService['getRuntimeRules']>>,
  ): string {
    const period = hour < 6 ? 0 : hour < 12 ? 1 : hour < 18 ? 2 : 3;
    const weatherOptions = this.resolveWeatherOptions(season, runtimeRules);
    return weatherOptions[period % weatherOptions.length] ?? '多云';
  }

  private resolveSeasonLabel(
    month: number,
    runtimeRules: Awaited<ReturnType<WorldService['getRuntimeRules']>>,
  ) {
    if (month >= 3 && month <= 5) {
      return runtimeRules.worldContextRules.seasonLabels.spring;
    }
    if (month >= 6 && month <= 8) {
      return runtimeRules.worldContextRules.seasonLabels.summer;
    }
    if (month >= 9 && month <= 11) {
      return runtimeRules.worldContextRules.seasonLabels.autumn;
    }
    return runtimeRules.worldContextRules.seasonLabels.winter;
  }

  private resolveWeatherOptions(
    season: string,
    runtimeRules: Awaited<ReturnType<WorldService['getRuntimeRules']>>,
  ) {
    const seasonLabels = runtimeRules.worldContextRules.seasonLabels;
    if (season === seasonLabels.spring) {
      return runtimeRules.worldContextRules.weatherOptions.spring;
    }
    if (season === seasonLabels.summer) {
      return runtimeRules.worldContextRules.weatherOptions.summer;
    }
    if (season === seasonLabels.autumn) {
      return runtimeRules.worldContextRules.weatherOptions.autumn;
    }
    if (season === seasonLabels.winter) {
      return runtimeRules.worldContextRules.weatherOptions.winter;
    }
    return ['多云'];
  }

  private resolveTimeOfDayLabel(
    hour: number,
    runtimeRules: Awaited<ReturnType<WorldService['getRuntimeRules']>>,
  ) {
    const labels = runtimeRules.semanticLabels.timeOfDayLabels;
    if (hour < 6) {
      return labels.lateNight;
    }
    if (hour < 9) {
      return labels.morning;
    }
    if (hour < 12) {
      return labels.forenoon;
    }
    if (hour < 14) {
      return labels.noon;
    }
    if (hour < 18) {
      return labels.afternoon;
    }
    if (hour < 21) {
      return labels.dusk;
    }
    return labels.evening;
  }

  private async refreshLocationFromIp(
    sourceIp: string,
    _currentLocation: WorldResolvedLocation,
  ) {
    try {
      const resolved = await this.lookupLocationByIp(sourceIp);
      await this.saveResolvedLocation(resolved);
    } catch (error) {
      this.logger.warn(
        `Failed to resolve request IP ${sourceIp}, keeping existing world location.`,
      );
    }
  }

  private async getResolvedLocation(): Promise<WorldResolvedLocation> {
    if (this.locationCache && Date.now() < this.locationCacheExpiresAt) {
      return this.locationCache;
    }

    const raw = await this.systemConfig.getConfig(
      WORLD_RUNTIME_LOCATION_CONFIG_KEY,
    );
    const parsed = this.parseResolvedLocation(raw);
    if (parsed) {
      this.primeLocationCache(parsed);
      return parsed;
    }

    const fallback = this.createDefaultLocation();
    await this.saveResolvedLocation(fallback);
    return fallback;
  }

  private parseResolvedLocation(
    raw: string | null,
  ): WorldResolvedLocation | null {
    if (!raw?.trim()) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<WorldResolvedLocation>;
      const source = parsed.source === 'ip' ? 'ip' : 'default';
      const timezone =
        normalizeString(parsed.timezone) || DEFAULT_WORLD_LOCATION.timezone;
      const country =
        normalizeString(parsed.country) || DEFAULT_WORLD_LOCATION.country;
      const region =
        normalizeString(parsed.region) || DEFAULT_WORLD_LOCATION.region;
      const city = normalizeString(parsed.city) || DEFAULT_WORLD_LOCATION.city;
      const resolvedAt =
        normalizeString(parsed.resolvedAt) || new Date().toISOString();

      return {
        source,
        sourceIp: normalizeString(parsed.sourceIp) || null,
        country,
        region,
        city,
        latitude: normalizeNumber(
          parsed.latitude,
          DEFAULT_WORLD_LOCATION.latitude,
        ),
        longitude: normalizeNumber(
          parsed.longitude,
          DEFAULT_WORLD_LOCATION.longitude,
        ),
        timezone,
        resolvedAt,
      };
    } catch {
      this.logger.warn(
        `Failed to parse ${WORLD_RUNTIME_LOCATION_CONFIG_KEY}, using Hangzhou fallback.`,
      );
      return null;
    }
  }

  private async saveResolvedLocation(location: WorldResolvedLocation) {
    await this.systemConfig.setConfig(
      WORLD_RUNTIME_LOCATION_CONFIG_KEY,
      JSON.stringify(location),
    );
    this.primeLocationCache(location);
  }

  private primeLocationCache(location: WorldResolvedLocation) {
    this.locationCache = location;
    this.locationCacheExpiresAt = Date.now() + WORLD_LOCATION_CACHE_TTL_MS;
  }

  private createDefaultLocation(): WorldResolvedLocation {
    return {
      ...DEFAULT_WORLD_LOCATION,
      resolvedAt: new Date().toISOString(),
    };
  }

  private async lookupLocationByIp(
    sourceIp: string,
  ): Promise<WorldResolvedLocation> {
    const response = await fetch(
      `https://ipwho.is/${encodeURIComponent(sourceIp)}`,
      {
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!response.ok) {
      throw new Error(`ipwho.is response ${response.status}`);
    }

    const payload = (await response.json()) as IpWhoIsResponse;
    if (!payload.success) {
      throw new Error('ipwho.is lookup failed');
    }

    return {
      source: 'ip',
      sourceIp,
      country:
        normalizeString(payload.country) || DEFAULT_WORLD_LOCATION.country,
      region: normalizeString(payload.region) || DEFAULT_WORLD_LOCATION.region,
      city: normalizeString(payload.city) || DEFAULT_WORLD_LOCATION.city,
      latitude: normalizeNumber(
        payload.latitude,
        DEFAULT_WORLD_LOCATION.latitude,
      ),
      longitude: normalizeNumber(
        payload.longitude,
        DEFAULT_WORLD_LOCATION.longitude,
      ),
      timezone:
        normalizeString(payload.timezone?.id) ||
        DEFAULT_WORLD_LOCATION.timezone,
      resolvedAt: new Date().toISOString(),
    };
  }

  private formatDateParts(date: Date, timezone: string) {
    return Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        hourCycle: 'h23',
      })
        .formatToParts(date)
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]),
    ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute', string>;
  }

  private buildLocationLabel(location: WorldResolvedLocation) {
    if (location.country === '中国') {
      return location.city || location.region || DEFAULT_WORLD_LOCATION.city;
    }

    if (location.city && location.region && location.region !== location.city) {
      return `${location.city} · ${location.region}`;
    }

    return location.city || location.region || location.country || '杭州';
  }

  private extractClientIp(request?: Request | null) {
    if (!request) {
      return null;
    }

    const forwarded = request.headers['x-forwarded-for'];
    const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const candidate = normalizeString(firstForwarded)
      ? normalizeString(firstForwarded).split(',')[0]?.trim()
      : (request.ip ?? request.socket.remoteAddress ?? null);

    if (!candidate) {
      return null;
    }

    const normalized = candidate
      .replace(/^::ffff:/i, '')
      .replace(/^\[(.*)\]$/, '$1')
      .trim();
    return normalized || null;
  }

  private isPrivateIp(sourceIp: string) {
    if (
      sourceIp === '::1' ||
      sourceIp === '::' ||
      sourceIp.startsWith('127.') ||
      sourceIp.startsWith('10.') ||
      sourceIp.startsWith('192.168.') ||
      sourceIp.startsWith('169.254.')
    ) {
      return true;
    }

    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(sourceIp)) {
      return true;
    }

    const lower = sourceIp.toLowerCase();
    return (
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80:')
    );
  }

  private mapWeatherCodeToLabel(weatherCode?: number, isDay?: number) {
    switch (weatherCode) {
      case 0:
        return isDay === 0 ? '夜空晴朗' : '晴朗';
      case 1:
        return '晴间多云';
      case 2:
        return '多云';
      case 3:
        return '阴天';
      case 45:
      case 48:
        return '有雾';
      case 51:
      case 53:
      case 55:
        return '毛毛雨';
      case 56:
      case 57:
        return '冻毛毛雨';
      case 61:
        return '小雨';
      case 63:
        return '中雨';
      case 65:
        return '大雨';
      case 66:
      case 67:
        return '冻雨';
      case 71:
        return '小雪';
      case 73:
        return '中雪';
      case 75:
        return '大雪';
      case 77:
        return '雪粒';
      case 80:
        return '阵雨';
      case 81:
        return '较强阵雨';
      case 82:
        return '强阵雨';
      case 85:
      case 86:
        return '阵雪';
      case 95:
        return '雷阵雨';
      case 96:
      case 99:
        return '雷暴伴冰雹';
      default:
        return '多云';
    }
  }
}
