import { Injectable, Logger } from '@nestjs/common';
import { SystemConfigService } from '../config/config.service';
import {
  ACTION_RUNTIME_RULES_CONFIG_KEY,
  DEFAULT_ACTION_RUNTIME_RULES,
  normalizeActionRuntimeRules,
} from './action-runtime.constants';
import type { ActionRuntimeRulesValue } from './action-runtime.types';

@Injectable()
export class ActionRuntimeRulesService {
  private readonly logger = new Logger(ActionRuntimeRulesService.name);
  private cachedRules: ActionRuntimeRulesValue = DEFAULT_ACTION_RUNTIME_RULES;

  constructor(private readonly systemConfig: SystemConfigService) {}

  async getRules(): Promise<ActionRuntimeRulesValue> {
    const raw = await this.systemConfig.getConfig(ACTION_RUNTIME_RULES_CONFIG_KEY);
    if (!raw) {
      this.cachedRules = DEFAULT_ACTION_RUNTIME_RULES;
      return this.cachedRules;
    }

    try {
      this.cachedRules = normalizeActionRuntimeRules(
        JSON.parse(raw) as Partial<ActionRuntimeRulesValue>,
      );
      return this.cachedRules;
    } catch {
      this.logger.warn(
        `Failed to parse ${ACTION_RUNTIME_RULES_CONFIG_KEY}, using defaults.`,
      );
      this.cachedRules = DEFAULT_ACTION_RUNTIME_RULES;
      return this.cachedRules;
    }
  }

  async setRules(
    input: Partial<ActionRuntimeRulesValue>,
  ): Promise<ActionRuntimeRulesValue> {
    const current = await this.getRules();
    const normalized = normalizeActionRuntimeRules({
      ...current,
      ...input,
      promptTemplates: {
        ...current.promptTemplates,
        ...(input.promptTemplates ?? {}),
      },
      policy: {
        ...current.policy,
        ...(input.policy ?? {}),
      },
    });
    await this.systemConfig.setConfig(
      ACTION_RUNTIME_RULES_CONFIG_KEY,
      JSON.stringify(normalized),
    );
    this.cachedRules = normalized;
    return normalized;
  }
}
