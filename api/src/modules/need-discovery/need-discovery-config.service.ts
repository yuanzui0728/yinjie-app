import { Injectable } from '@nestjs/common';
import { SystemConfigService } from '../config/config.service';
import {
  DEFAULT_NEED_DISCOVERY_CONFIG,
  NEED_DISCOVERY_CONFIG_KEY,
  type NeedDiscoveryConfig,
} from './need-discovery.types';

@Injectable()
export class NeedDiscoveryConfigService {
  constructor(private readonly systemConfig: SystemConfigService) {}

  async getConfig(): Promise<NeedDiscoveryConfig> {
    const raw = await this.systemConfig.getConfig(NEED_DISCOVERY_CONFIG_KEY);
    if (!raw?.trim()) {
      return DEFAULT_NEED_DISCOVERY_CONFIG;
    }

    try {
      return normalizeNeedDiscoveryConfig(
        JSON.parse(raw) as Partial<NeedDiscoveryConfig>,
      );
    } catch {
      return DEFAULT_NEED_DISCOVERY_CONFIG;
    }
  }

  async setConfig(
    patch: Partial<NeedDiscoveryConfig>,
  ): Promise<NeedDiscoveryConfig> {
    const current = await this.getConfig();
    const next = normalizeNeedDiscoveryConfig({
      ...current,
      ...patch,
      shortInterval: {
        ...current.shortInterval,
        ...(patch.shortInterval ?? {}),
      },
      daily: {
        ...current.daily,
        ...(patch.daily ?? {}),
      },
      shared: {
        ...current.shared,
        ...(patch.shared ?? {}),
      },
    });
    await this.systemConfig.setConfig(
      NEED_DISCOVERY_CONFIG_KEY,
      JSON.stringify(next),
    );
    return next;
  }
}

function normalizeNeedDiscoveryConfig(
  value: Partial<NeedDiscoveryConfig>,
): NeedDiscoveryConfig {
  const base = DEFAULT_NEED_DISCOVERY_CONFIG;
  const shortInterval =
    value.shortInterval ??
    ({} as Partial<NeedDiscoveryConfig['shortInterval']>);
  const daily =
    value.daily ?? ({} as Partial<NeedDiscoveryConfig['daily']>);
  const shared =
    value.shared ?? ({} as Partial<NeedDiscoveryConfig['shared']>);

  return {
    shortInterval: {
      enabled: shortInterval.enabled ?? base.shortInterval.enabled,
      executionMode:
        shortInterval.executionMode === 'dry_run' ? 'dry_run' : 'auto_send',
      maxCandidatesPerRun: normalizeInteger(
        shortInterval.maxCandidatesPerRun,
        base.shortInterval.maxCandidatesPerRun,
        0,
        5,
      ),
      minConfidenceScore: normalizeScore(
        shortInterval.minConfidenceScore,
        base.shortInterval.minConfidenceScore,
      ),
      intervalMinutes: normalizeInteger(
        shortInterval.intervalMinutes,
        base.shortInterval.intervalMinutes,
        10,
        24 * 60,
      ),
      lookbackHours: normalizeInteger(
        shortInterval.lookbackHours,
        base.shortInterval.lookbackHours,
        1,
        7 * 24,
      ),
      skipIfNoNewSignals:
        shortInterval.skipIfNoNewSignals ??
        base.shortInterval.skipIfNoNewSignals,
      promptTemplate:
        normalizeTemplate(
          shortInterval.promptTemplate,
          base.shortInterval.promptTemplate,
        ) ?? base.shortInterval.promptTemplate,
    },
    daily: {
      enabled: daily.enabled ?? base.daily.enabled,
      executionMode:
        daily.executionMode === 'dry_run' ? 'dry_run' : 'auto_send',
      maxCandidatesPerRun: normalizeInteger(
        daily.maxCandidatesPerRun,
        base.daily.maxCandidatesPerRun,
        0,
        5,
      ),
      minConfidenceScore: normalizeScore(
        daily.minConfidenceScore,
        base.daily.minConfidenceScore,
      ),
      runAtHour: normalizeInteger(
        daily.runAtHour,
        base.daily.runAtHour,
        0,
        23,
      ),
      runAtMinute: normalizeInteger(
        daily.runAtMinute,
        base.daily.runAtMinute,
        0,
        59,
      ),
      lookbackDays: normalizeInteger(
        daily.lookbackDays,
        base.daily.lookbackDays,
        1,
        60,
      ),
      promptTemplate:
        normalizeTemplate(daily.promptTemplate, base.daily.promptTemplate) ??
        base.daily.promptTemplate,
    },
    shared: {
      pendingCandidateLimit: normalizeInteger(
        shared.pendingCandidateLimit,
        base.shared.pendingCandidateLimit,
        0,
        20,
      ),
      dailyCreationLimit: normalizeInteger(
        shared.dailyCreationLimit,
        base.shared.dailyCreationLimit,
        0,
        20,
      ),
      expiryDays: normalizeInteger(
        shared.expiryDays,
        base.shared.expiryDays,
        1,
        30,
      ),
      shortSuppressionDays: normalizeInteger(
        shared.shortSuppressionDays,
        base.shared.shortSuppressionDays,
        0,
        30,
      ),
      dailySuppressionDays: normalizeInteger(
        shared.dailySuppressionDays,
        base.shared.dailySuppressionDays,
        0,
        90,
      ),
      coverageDomainOverlapThreshold: normalizeScore(
        shared.coverageDomainOverlapThreshold,
        base.shared.coverageDomainOverlapThreshold,
      ),
      allowMedical: shared.allowMedical ?? base.shared.allowMedical,
      allowLegal: shared.allowLegal ?? base.shared.allowLegal,
      allowFinance: shared.allowFinance ?? base.shared.allowFinance,
      roleGenerationPrompt:
        normalizeTemplate(
          shared.roleGenerationPrompt,
          base.shared.roleGenerationPrompt,
        ) ?? base.shared.roleGenerationPrompt,
    },
  };
}

function normalizeInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN;
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function normalizeScore(value: unknown, fallback: number) {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN;
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, numeric));
}

function normalizeTemplate(value: unknown, fallback: string) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
}
