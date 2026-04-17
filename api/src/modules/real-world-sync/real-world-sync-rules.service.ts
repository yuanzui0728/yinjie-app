import { Injectable, Logger } from '@nestjs/common';
import { SystemConfigService } from '../config/config.service';
import {
  DEFAULT_REAL_WORLD_SYNC_RULES,
  REAL_WORLD_SYNC_RULES_CONFIG_KEY,
  normalizeRealWorldSyncRules,
} from './real-world-sync.constants';
import type { RealWorldSyncRulesValue } from './real-world-sync.types';

@Injectable()
export class RealWorldSyncRulesService {
  private readonly logger = new Logger(RealWorldSyncRulesService.name);
  private cachedRules: RealWorldSyncRulesValue = DEFAULT_REAL_WORLD_SYNC_RULES;

  constructor(private readonly systemConfig: SystemConfigService) {}

  async getRules(): Promise<RealWorldSyncRulesValue> {
    const raw = await this.systemConfig.getConfig(REAL_WORLD_SYNC_RULES_CONFIG_KEY);
    if (!raw) {
      this.cachedRules = DEFAULT_REAL_WORLD_SYNC_RULES;
      return this.cachedRules;
    }

    try {
      this.cachedRules = normalizeRealWorldSyncRules(
        JSON.parse(raw) as Partial<RealWorldSyncRulesValue>,
      );
      return this.cachedRules;
    } catch {
      this.logger.warn(
        `Failed to parse ${REAL_WORLD_SYNC_RULES_CONFIG_KEY}, using defaults.`,
      );
      this.cachedRules = DEFAULT_REAL_WORLD_SYNC_RULES;
      return this.cachedRules;
    }
  }

  getCachedRules() {
    return this.cachedRules;
  }

  async setRules(
    input: Partial<RealWorldSyncRulesValue>,
  ): Promise<RealWorldSyncRulesValue> {
    const normalized = normalizeRealWorldSyncRules(input);
    await this.systemConfig.setConfig(
      REAL_WORLD_SYNC_RULES_CONFIG_KEY,
      JSON.stringify(normalized),
    );
    this.cachedRules = normalized;
    return normalized;
  }
}
