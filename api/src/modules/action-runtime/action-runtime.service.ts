import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CharacterEntity } from '../characters/character.entity';
import { DEFAULT_ACTION_CONNECTOR_SEEDS } from './action-runtime.constants';
import { ActionConnectorEntity } from './action-connector.entity';
import { ActionRunEntity } from './action-run.entity';
import { ActionRuntimeRulesService } from './action-runtime-rules.service';
import type {
  ActionConnectorSeedValue,
  ActionExecutionResultValue,
  ActionHandlingResultValue,
  ActionPlanValue,
  ActionRuntimeRulesValue,
} from './action-runtime.types';

function renderTemplate(
  template: string,
  variables: Record<string, string | number | undefined | null>,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    variables[key] == null ? '' : String(variables[key]),
  );
}

function appendTrace(
  tracePayload: Record<string, unknown> | null | undefined,
  event: Record<string, unknown>,
) {
  const existingSteps = Array.isArray(tracePayload?.steps)
    ? [...(tracePayload?.steps as Array<Record<string, unknown>>)]
    : [];
  existingSteps.push({
    ...event,
    at: new Date().toISOString(),
  });
  return {
    ...(tracePayload ?? {}),
    steps: existingSteps,
  };
}

function createRunId() {
  return `action_run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createMockReference(prefix: string) {
  return `${prefix.toUpperCase()}-${Date.now().toString().slice(-8)}`;
}

function normalizeUserMessage(input: string) {
  return input.trim();
}

@Injectable()
export class ActionRuntimeService {
  private connectorsSeeded = false;

  constructor(
    @InjectRepository(ActionConnectorEntity)
    private readonly connectorRepo: Repository<ActionConnectorEntity>,
    @InjectRepository(ActionRunEntity)
    private readonly runRepo: Repository<ActionRunEntity>,
    @InjectRepository(CharacterEntity)
    private readonly characterRepo: Repository<CharacterEntity>,
    private readonly rulesService: ActionRuntimeRulesService,
  ) {}

  async handleConversationTurn(input: {
    conversationId: string;
    ownerId: string;
    character: CharacterEntity;
    userMessage: string;
  }): Promise<ActionHandlingResultValue> {
    await this.ensureDefaultConnectors();
    const rules = await this.rulesService.getRules();
    const userMessage = normalizeUserMessage(input.userMessage);

    if (!rules.policy.enabled || !userMessage) {
      return { handled: false };
    }

    if (rules.policy.selfRoleOnly && !this.isSelfCharacter(input.character)) {
      return { handled: false };
    }

    const connectors = await this.listReadyConnectorEntities();
    const pendingRun = await this.findLatestPendingRun(
      input.conversationId,
      input.ownerId,
      input.character.id,
    );

    if (pendingRun) {
      return this.handlePendingRun({
        run: pendingRun,
        userMessage,
        rules,
        connectors,
      });
    }

    const preview = this.planActionFromMessage(userMessage, connectors, rules);
    if (!preview.handled || !preview.plan) {
      return { handled: false };
    }

    const plan = preview.plan;
    const run = this.runRepo.create({
      id: createRunId(),
      conversationId: input.conversationId,
      ownerId: input.ownerId,
      characterId: input.character.id,
      connectorKey: plan.connectorKey,
      operationKey: plan.operationKey,
      title: plan.title,
      status: 'draft',
      riskLevel: plan.riskLevel,
      requiresConfirmation: plan.requiresConfirmation,
      userGoal: plan.goal,
      slotPayload: { ...plan.slots },
      missingSlots: [...plan.missingSlots],
      planPayload: plan,
      tracePayload: appendTrace(null, {
        phase: 'plan_created',
        plannerMode: rules.plannerMode,
        matchedKeywords: plan.matchedKeywords,
        promptPreview: plan.promptPreview,
      }),
    });

    if (plan.missingSlots.length > 0) {
      run.status = 'awaiting_slots';
      run.policyDecisionPayload = {
        reason: 'missing_required_slots',
        missingSlots: [...plan.missingSlots],
      };
      await this.runRepo.save(run);
      return {
        handled: true,
        responseText: this.renderClarification(plan, rules),
      };
    }

    if (this.requiresConfirmation(plan, rules)) {
      run.status = 'awaiting_confirmation';
      run.policyDecisionPayload = {
        reason: 'requires_confirmation',
        autoExecutable: false,
      };
      run.confirmationPayload = {
        requestedAt: new Date().toISOString(),
        confirmationKeywords: [...rules.policy.confirmationKeywords],
      };
      run.tracePayload = appendTrace(run.tracePayload, {
        phase: 'awaiting_confirmation',
        slotSummary: this.describeSlots(plan.slots),
      });
      await this.runRepo.save(run);
      return {
        handled: true,
        responseText: this.renderConfirmation(plan, rules),
      };
    }

    run.status = 'running';
    run.policyDecisionPayload = {
      reason: 'auto_execute',
      autoExecutable: true,
    };
    run.tracePayload = appendTrace(run.tracePayload, {
      phase: 'auto_execute',
    });
    await this.runRepo.save(run);
    return this.executeRun(run, rules, connectors);
  }

  async getAdminOverview() {
    await this.ensureDefaultConnectors();
    const [rules, connectors, recentRuns, selfCharacter] = await Promise.all([
      this.rulesService.getRules(),
      this.connectorRepo.find({ order: { displayName: 'ASC' } }),
      this.runRepo.find({
        order: { updatedAt: 'DESC' },
        take: 12,
      }),
      this.findSelfCharacter(),
    ]);

    const totalRuns = await this.runRepo.count();
    const awaitingSlots = await this.runRepo.count({
      where: { status: 'awaiting_slots' },
    });
    const awaitingConfirmation = await this.runRepo.count({
      where: { status: 'awaiting_confirmation' },
    });
    const succeeded = await this.runRepo.count({
      where: { status: 'succeeded' },
    });
    const failed = await this.runRepo.count({
      where: { status: 'failed' },
    });

    return {
      rules,
      connectors: connectors.map((connector) => this.serializeConnector(connector)),
      recentRuns: recentRuns.map((run) => this.serializeRun(run)),
      counts: {
        totalRuns,
        awaitingSlots,
        awaitingConfirmation,
        succeeded,
        failed,
        readyConnectors: connectors.filter((item) => item.status === 'ready')
          .length,
      },
      selfCharacter: selfCharacter
        ? {
            id: selfCharacter.id,
            name: selfCharacter.name,
          }
        : null,
    };
  }

  async getRules() {
    return this.rulesService.getRules();
  }

  async setRules(payload: Partial<ActionRuntimeRulesValue>) {
    return this.rulesService.setRules(payload);
  }

  async listConnectors() {
    await this.ensureDefaultConnectors();
    const connectors = await this.connectorRepo.find({
      order: { displayName: 'ASC' },
    });
    return connectors.map((connector) => this.serializeConnector(connector));
  }

  async updateConnector(
    id: string,
    payload: {
      displayName?: string;
      status?: 'disabled' | 'ready' | 'error';
      endpointConfig?: Record<string, unknown> | null;
    },
  ) {
    await this.ensureDefaultConnectors();
    const connector = await this.connectorRepo.findOneBy({ id });
    if (!connector) {
      throw new NotFoundException(`Connector ${id} not found`);
    }

    if (typeof payload.displayName === 'string' && payload.displayName.trim()) {
      connector.displayName = payload.displayName.trim();
    }
    if (
      payload.status === 'disabled' ||
      payload.status === 'ready' ||
      payload.status === 'error'
    ) {
      connector.status = payload.status;
      if (payload.status === 'ready') {
        connector.lastError = null;
      }
    }
    if (payload.endpointConfig !== undefined) {
      connector.endpointConfigPayload = payload.endpointConfig;
    }

    await this.connectorRepo.save(connector);
    return this.serializeConnector(connector);
  }

  async listRuns(limit = 20) {
    await this.ensureDefaultConnectors();
    const runs = await this.runRepo.find({
      order: { updatedAt: 'DESC' },
      take: Math.max(1, Math.min(100, Math.round(limit))),
    });
    return runs.map((run) => this.serializeRun(run));
  }

  async getRun(id: string) {
    await this.ensureDefaultConnectors();
    const run = await this.runRepo.findOneBy({ id });
    if (!run) {
      throw new NotFoundException(`Action run ${id} not found`);
    }
    return this.serializeRunDetail(run);
  }

  async previewMessage(message: string) {
    await this.ensureDefaultConnectors();
    const rules = await this.rulesService.getRules();
    const connectors = await this.listReadyConnectorEntities();
    const preview = this.planActionFromMessage(message, connectors, rules);
    if (!preview.handled || !preview.plan) {
      return {
        handled: false,
        reason: preview.reason,
        plan: null,
        responsePreview: null,
      };
    }

    const plan = preview.plan;
    let responsePreview: string;
    if (plan.missingSlots.length > 0) {
      responsePreview = this.renderClarification(plan, rules);
    } else if (this.requiresConfirmation(plan, rules)) {
      responsePreview = this.renderConfirmation(plan, rules);
    } else {
      const connector = connectors.find(
        (item) => item.connectorKey === plan.connectorKey,
      );
      const execution = this.executeMockOperation(plan, connector, true);
      responsePreview = this.renderSuccess(
        plan,
        connector?.displayName ?? plan.connectorKey,
        execution.resultSummary,
        rules,
      );
    }

    return {
      handled: true,
      reason: preview.reason,
      plan,
      responsePreview,
    };
  }

  private async ensureDefaultConnectors() {
    if (this.connectorsSeeded) {
      return;
    }

    const existing = await this.connectorRepo.find();
    const existingByKey = new Map(
      existing.map((connector) => [connector.connectorKey, connector]),
    );
    const inserts = DEFAULT_ACTION_CONNECTOR_SEEDS.filter(
      (seed) => !existingByKey.has(seed.connectorKey),
    ).map((seed) => this.connectorRepo.create(seed));

    if (inserts.length > 0) {
      await this.connectorRepo.save(inserts);
    }
    this.connectorsSeeded = true;
  }

  private async findSelfCharacter() {
    const all = await this.characterRepo.find({ order: { name: 'ASC' } });
    return (
      all.find((character) => this.isSelfCharacter(character)) ?? null
    );
  }

  private isSelfCharacter(character: CharacterEntity) {
    return (
      character.relationshipType === 'self' ||
      character.sourceKey?.trim() === 'self'
    );
  }

  private async listReadyConnectorEntities() {
    return this.connectorRepo.find({
      where: { status: 'ready' },
      order: { displayName: 'ASC' },
    });
  }

  private async findLatestPendingRun(
    conversationId: string,
    ownerId: string,
    characterId: string,
  ) {
    return this.runRepo.findOne({
      where: [
        {
          conversationId,
          ownerId,
          characterId,
          status: 'awaiting_slots',
        },
        {
          conversationId,
          ownerId,
          characterId,
          status: 'awaiting_confirmation',
        },
      ],
      order: { updatedAt: 'DESC' },
    });
  }

  private async handlePendingRun(input: {
    run: ActionRunEntity;
    userMessage: string;
    rules: ActionRuntimeRulesValue;
    connectors: ActionConnectorEntity[];
  }): Promise<ActionHandlingResultValue> {
    const { run, userMessage, rules, connectors } = input;
    const normalized = normalizeUserMessage(userMessage);
    const plan = run.planPayload;
    if (!plan) {
      return { handled: false };
    }

    if (
      run.status === 'awaiting_confirmation' &&
      this.matchesKeyword(normalized, rules.policy.rejectionKeywords)
    ) {
      run.status = 'cancelled';
      run.tracePayload = appendTrace(run.tracePayload, {
        phase: 'cancelled',
        reason: 'user_rejected',
      });
      await this.runRepo.save(run);
      return {
        handled: true,
        responseText: this.renderCancelled(plan, rules),
      };
    }

    if (
      run.status === 'awaiting_confirmation' &&
      this.matchesKeyword(normalized, rules.policy.confirmationKeywords)
    ) {
      run.status = 'running';
      run.tracePayload = appendTrace(run.tracePayload, {
        phase: 'confirmation_received',
      });
      await this.runRepo.save(run);
      return this.executeRun(run, rules, connectors);
    }

    const mergedPlan = this.mergePlanWithMessage(plan, normalized, rules);
    run.planPayload = mergedPlan;
    run.slotPayload = { ...mergedPlan.slots };
    run.missingSlots = [...mergedPlan.missingSlots];
    run.tracePayload = appendTrace(run.tracePayload, {
      phase: 'user_followup',
      mergedSlots: { ...mergedPlan.slots },
      missingSlots: [...mergedPlan.missingSlots],
    });

    if (mergedPlan.missingSlots.length > 0) {
      run.status = 'awaiting_slots';
      run.policyDecisionPayload = {
        reason: 'missing_required_slots',
        missingSlots: [...mergedPlan.missingSlots],
      };
      await this.runRepo.save(run);
      return {
        handled: true,
        responseText: this.renderClarification(mergedPlan, rules),
      };
    }

    if (this.requiresConfirmation(mergedPlan, rules)) {
      run.status = 'awaiting_confirmation';
      run.confirmationPayload = {
        requestedAt: new Date().toISOString(),
        confirmationKeywords: [...rules.policy.confirmationKeywords],
      };
      await this.runRepo.save(run);
      return {
        handled: true,
        responseText:
          run.status === 'awaiting_confirmation'
            ? this.renderConfirmation(mergedPlan, rules)
            : rules.promptTemplates.pendingConfirmationReminderTemplate,
      };
    }

    run.status = 'running';
    await this.runRepo.save(run);
    return this.executeRun(run, rules, connectors);
  }

  private async executeRun(
    run: ActionRunEntity,
    rules: ActionRuntimeRulesValue,
    connectors: ActionConnectorEntity[],
  ): Promise<ActionHandlingResultValue> {
    const plan = run.planPayload;
    if (!plan) {
      return { handled: false };
    }

    const connector = connectors.find(
      (item) => item.connectorKey === run.connectorKey,
    );
    if (!connector) {
      run.status = 'failed';
      run.errorMessage = '对应连接器当前不可用。';
      run.errorPayload = {
        code: 'CONNECTOR_UNAVAILABLE',
      };
      run.tracePayload = appendTrace(run.tracePayload, {
        phase: 'failed',
        code: 'CONNECTOR_UNAVAILABLE',
      });
      await this.runRepo.save(run);
      return {
        handled: true,
        responseText: this.renderFailure(plan, run.errorMessage, rules),
      };
    }

    try {
      const execution = this.executeMockOperation(plan, connector, false);
      run.status = 'succeeded';
      run.executionPayload = execution.executionPayload;
      run.resultPayload = execution.resultPayload;
      run.resultSummary = execution.resultSummary;
      run.errorPayload = null;
      run.errorMessage = null;
      run.tracePayload = appendTrace(run.tracePayload, {
        phase: 'succeeded',
        resultSummary: execution.resultSummary,
      });
      await this.runRepo.save(run);
      return {
        handled: true,
        responseText: this.renderSuccess(
          plan,
          connector.displayName,
          execution.resultSummary,
          rules,
        ),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '执行过程中出现未知异常。';
      run.status = 'failed';
      run.errorMessage = message;
      run.errorPayload = {
        code: 'MOCK_EXECUTION_FAILED',
        message,
      };
      run.tracePayload = appendTrace(run.tracePayload, {
        phase: 'failed',
        code: 'MOCK_EXECUTION_FAILED',
        message,
      });
      await this.runRepo.save(run);
      return {
        handled: true,
        responseText: this.renderFailure(plan, message, rules),
      };
    }
  }

  private planActionFromMessage(
    message: string,
    connectors: ActionConnectorEntity[],
    rules: ActionRuntimeRulesValue,
  ): {
    handled: boolean;
    reason: string;
    plan?: ActionPlanValue;
  } {
    const normalized = normalizeUserMessage(message);
    if (!normalized) {
      return {
        handled: false,
        reason: '消息为空，未进入动作链。',
      };
    }

    const smartHomePlan = this.buildSmartHomePlan(normalized, connectors, rules);
    if (smartHomePlan) {
      return {
        handled: true,
        reason: '命中智能家居动作规则。',
        plan: smartHomePlan,
      };
    }

    const foodPlan = this.buildFoodDeliveryPlan(normalized, connectors, rules);
    if (foodPlan) {
      return {
        handled: true,
        reason: '命中外卖动作规则。',
        plan: foodPlan,
      };
    }

    const ticketPlan = this.buildTicketPlan(normalized, connectors, rules);
    if (ticketPlan) {
      return {
        handled: true,
        reason: '命中订票动作规则。',
        plan: ticketPlan,
      };
    }

    return {
      handled: false,
      reason: '当前消息没有命中真实世界动作规则。',
    };
  }

  private buildSmartHomePlan(
    message: string,
    connectors: ActionConnectorEntity[],
    rules: ActionRuntimeRulesValue,
  ) {
    const parsed = this.parseSmartHomeSlots(message);

    const hitSmartHome = Boolean(
      parsed.slots.device ||
        parsed.slots.room ||
        message.includes('智能'),
    );
    if (!hitSmartHome) {
      return null;
    }

    const connector = connectors.find(
      (item) => item.connectorKey === 'mock-smart-home',
    );
    if (!connector) {
      return null;
    }
    const operation = this.findOperation(connector, 'smart_home_control');
    if (!operation) {
      return null;
    }

    const missingSlots = this.resolveMissingSlots(
      operation.operationKey,
      operation.domain,
      parsed.slots,
    );
    const title = `${(parsed.slots.room as string | undefined) ?? '指定房间'}${
      (parsed.slots.device as string | undefined) ?? '设备'
    }${parsed.actionLabel || '控制'}${
      parsed.slots.temperatureCelsius != null
        ? `${parsed.slots.temperatureCelsius as number}度`
        : ''
    }`;

    return {
      connectorKey: connector.connectorKey,
      operationKey: operation.operationKey,
      domain: operation.domain,
      title,
      goal: message,
      rationale: '识别到设备名称和控制动作，进入智能家居 mock 执行链。',
      riskLevel: operation.riskLevel,
      requiresConfirmation: operation.requiresConfirmation,
      slots: parsed.slots,
      missingSlots,
      matchedKeywords: parsed.matchedKeywords,
      promptPreview: this.buildPromptPreview(message, connectors, rules),
    };
  }

  private buildFoodDeliveryPlan(
    message: string,
    connectors: ActionConnectorEntity[],
    rules: ActionRuntimeRulesValue,
  ) {
    const parsed = this.parseFoodDeliverySlots(message);
    const hitFood =
      message.includes('外卖') ||
      message.includes('点餐') ||
      message.includes('点个') ||
      message.includes('午饭') ||
      message.includes('晚饭') ||
      parsed.matchedKeywords.length > 0;
    if (!hitFood) {
      return null;
    }

    const connector = connectors.find(
      (item) => item.connectorKey === 'mock-food-delivery',
    );
    if (!connector) {
      return null;
    }

    const submitIntent =
      message.includes('下单') ||
      message.includes('直接点') ||
      message.includes('帮我点') ||
      message.includes('现在点');
    const operation = this.findOperation(
      connector,
      submitIntent ? 'food_delivery_submit' : 'food_delivery_prepare',
    );
    if (!operation) {
      return null;
    }

    const missingSlots = this.resolveMissingSlots(
      operation.operationKey,
      operation.domain,
      parsed.slots,
    );

    return {
      connectorKey: connector.connectorKey,
      operationKey: operation.operationKey,
      domain: operation.domain,
      title: submitIntent ? '外卖下单' : '外卖候选整理',
      goal: message,
      rationale: submitIntent
        ? '识别到外卖下单意图，先进入确认链。'
        : '识别到外卖需求，先整理候选方案。',
      riskLevel: operation.riskLevel,
      requiresConfirmation: operation.requiresConfirmation,
      slots: parsed.slots,
      missingSlots,
      matchedKeywords: parsed.matchedKeywords,
      promptPreview: this.buildPromptPreview(message, connectors, rules),
    };
  }

  private buildTicketPlan(
    message: string,
    connectors: ActionConnectorEntity[],
    rules: ActionRuntimeRulesValue,
  ) {
    const parsed = this.parseTicketSlots(message);
    const ticketType =
      message.includes('机票')
        ? '机票'
        : message.includes('火车票') || message.includes('高铁')
          ? '火车票'
          : message.includes('电影票')
            ? '电影票'
            : message.includes('演唱会')
              ? '演出票'
              : '票';
    const hitTicket =
      message.includes('订票') ||
      message.includes('买票') ||
      message.includes('机票') ||
      message.includes('火车票') ||
      message.includes('高铁') ||
      message.includes('电影票') ||
      message.includes('演唱会');
    if (!hitTicket) {
      return null;
    }

    const connector = connectors.find(
      (item) => item.connectorKey === 'mock-ticketing',
    );
    if (!connector) {
      return null;
    }

    const submitIntent =
      message.includes('直接订') ||
      message.includes('帮我订') ||
      message.includes('买这张') ||
      message.includes('就订这个');
    const operation = this.findOperation(
      connector,
      submitIntent ? 'ticket_booking_submit' : 'ticket_booking_prepare',
    );
    if (!operation) {
      return null;
    }

    const slots: Record<string, unknown> = {
      ticketType,
      ...parsed.slots,
    };
    const missingSlots = this.resolveMissingSlots(
      operation.operationKey,
      operation.domain,
      slots,
    );

    return {
      connectorKey: connector.connectorKey,
      operationKey: operation.operationKey,
      domain: operation.domain,
      title: submitIntent ? `${ticketType}预订` : `${ticketType}方案整理`,
      goal: message,
      rationale: submitIntent
        ? '识别到订票执行意图，先进入确认链。'
        : '识别到订票查询意图，先整理候选方案。',
      riskLevel: operation.riskLevel,
      requiresConfirmation: operation.requiresConfirmation,
      slots,
      missingSlots,
      matchedKeywords: parsed.matchedKeywords,
      promptPreview: this.buildPromptPreview(message, connectors, rules),
    };
  }

  private buildPromptPreview(
    message: string,
    connectors: ActionConnectorEntity[],
    rules: ActionRuntimeRulesValue,
  ) {
    const visibleConnectors =
      connectors.length > 0
        ? connectors
        : DEFAULT_ACTION_CONNECTOR_SEEDS.map((seed) =>
            this.connectorRepo.create(seed),
          );
    const connectorSummary = visibleConnectors
      .map((connector) => {
        const operations = (connector.capabilitiesPayload ?? [])
          .map((operation) => `${operation.operationKey}:${operation.requiredSlots.join('+') || 'none'}`)
          .join(', ');
        return `${connector.connectorKey}(${operations})`;
      })
      .join('\n');
    return [
      rules.promptTemplates.plannerSystemPrompt,
      `用户消息：${message}`,
      `可用连接器：\n${connectorSummary}`,
      `当前 plannerMode：${rules.plannerMode}`,
    ].join('\n\n');
  }

  private mergePlanWithMessage(
    plan: ActionPlanValue,
    message: string,
    rules: ActionRuntimeRulesValue,
  ) {
    const mergedSlots = {
      ...plan.slots,
      ...this.extractSupplementalSlots(plan.domain, message),
    };
    const nextPlan: ActionPlanValue = {
      ...plan,
      goal: `${plan.goal}\n补充：${message}`,
      slots: mergedSlots,
      matchedKeywords: Array.from(
        new Set([
          ...plan.matchedKeywords,
          ...this.extractMatchedKeywords(plan.domain, message),
        ]),
      ),
      promptPreview: this.buildPromptPreview(
        `${plan.goal}\n补充：${message}`,
        [],
        rules,
      ),
      missingSlots: this.resolveMissingSlots(
        plan.operationKey,
        plan.domain,
        mergedSlots,
      ),
    };
    return nextPlan;
  }

  private extractSupplementalSlots(domain: string, message: string) {
    if (domain === 'smart_home') {
      return this.parseSmartHomeSlots(message).slots;
    }

    if (domain === 'food_delivery') {
      return this.parseFoodDeliverySlots(message).slots;
    }

    if (domain === 'ticketing') {
      return this.parseTicketSlots(message).slots;
    }

    return {};
  }

  private parseSmartHomeSlots(message: string) {
    const matchedKeywords: string[] = [];
    const deviceMap: Array<[string, string[]]> = [
      ['灯', ['灯', '灯光', '台灯']],
      ['空调', ['空调']],
      ['窗帘', ['窗帘']],
      ['电视', ['电视']],
      ['净化器', ['净化器', '空气净化器']],
    ];
    const roomKeywords = ['客厅', '卧室', '书房', '厨房', '阳台', '全屋'];

    const slots: Record<string, unknown> = {};
    const room = roomKeywords.find((keyword) => message.includes(keyword));
    if (room) {
      slots.room = room;
      matchedKeywords.push(room);
    }

    for (const [label, keywords] of deviceMap) {
      if (keywords.some((keyword) => message.includes(keyword))) {
        slots.device = label;
        matchedKeywords.push(label);
        break;
      }
    }

    let actionLabel = '';
    if (/调到?\s*\d{2}\s*度/.test(message) || /设为?\s*\d{2}\s*度/.test(message)) {
      slots.action = 'set_temperature';
      actionLabel = '调到';
      matchedKeywords.push('温度');
    } else if (
      ['打开', '开一下', '开', '启动'].some((keyword) =>
        message.includes(keyword),
      )
    ) {
      slots.action = 'turn_on';
      actionLabel = '打开';
    } else if (
      ['关闭', '关掉', '关上', '关', '停掉'].some((keyword) =>
        message.includes(keyword),
      )
    ) {
      slots.action = 'turn_off';
      actionLabel = '关闭';
    }

    const temperatureMatch = message.match(/(\d{2})\s*度/);
    if (temperatureMatch) {
      slots.temperatureCelsius = Number(temperatureMatch[1]);
    }

    return {
      slots,
      matchedKeywords,
      actionLabel,
    };
  }

  private parseFoodDeliverySlots(message: string) {
    const matchedKeywords: string[] = [];
    const preferenceKeywords = [
      '汉堡',
      '轻食',
      '沙拉',
      '咖啡',
      '奶茶',
      '粥',
      '火锅',
      '麻辣烫',
      '面',
      '米饭',
    ];

    const slots: Record<string, unknown> = {};
    const preference = preferenceKeywords.find((keyword) =>
      message.includes(keyword),
    );
    if (preference) {
      slots.preference = preference;
      matchedKeywords.push(preference);
    }

    const budgetMatch = message.match(/(\d{2,4})\s*(?:块|元)/);
    if (budgetMatch) {
      slots.budgetCny = Number(budgetMatch[1]);
      matchedKeywords.push(`预算${budgetMatch[1]}`);
    }

    const addressMatch = message.match(
      /(?:送到|送去|地址是)([^，。,.；;]+)/,
    );
    if (addressMatch?.[1]?.trim()) {
      slots.address = addressMatch[1].trim();
      matchedKeywords.push('地址');
    }

    return {
      slots,
      matchedKeywords,
    };
  }

  private parseTicketSlots(message: string) {
    const matchedKeywords: string[] = [];
    const slots: Record<string, unknown> = {};

    const routeMatch = message.match(
      /(?:从)?([^\s，。,.；;]{1,8})(?:到|去)([^\s，。,.；;]{1,8})/,
    );
    if (routeMatch) {
      slots.route = `${routeMatch[1].trim()} -> ${routeMatch[2].trim()}`;
      matchedKeywords.push(String(slots.route));
    }

    const dateMatch = message.match(
      /(明天|后天|今晚|周一|周二|周三|周四|周五|周六|周日|下周[一二三四五六日])/,
    );
    if (dateMatch?.[1]) {
      slots.date = dateMatch[1];
      matchedKeywords.push(dateMatch[1]);
    }

    return {
      slots,
      matchedKeywords,
    };
  }

  private extractMatchedKeywords(domain: string, message: string) {
    if (domain === 'smart_home') {
      return ['灯', '空调', '窗帘', '客厅', '卧室', '温度'].filter((keyword) =>
        message.includes(keyword),
      );
    }
    if (domain === 'food_delivery') {
      return ['外卖', '咖啡', '奶茶', '沙拉', '汉堡', '地址'].filter((keyword) =>
        message.includes(keyword),
      );
    }
    if (domain === 'ticketing') {
      return ['订票', '机票', '火车票', '电影票', '演唱会', '明天', '后天'].filter(
        (keyword) => message.includes(keyword),
      );
    }
    return [];
  }

  private resolveMissingSlots(
    operationKey: string,
    domain: string,
    slots: Record<string, unknown>,
  ) {
    if (operationKey === 'smart_home_control') {
      const missing: string[] = [];
      if (!slots.device) {
        missing.push('device');
      }
      if (!slots.action) {
        missing.push('action');
      }
      if (
        slots.action === 'set_temperature' &&
        slots.temperatureCelsius == null
      ) {
        missing.push('temperatureCelsius');
      }
      return missing;
    }

    if (operationKey === 'food_delivery_submit') {
      const missing: string[] = [];
      if (!slots.preference) {
        missing.push('preference');
      }
      if (!slots.address) {
        missing.push('address');
      }
      return missing;
    }

    if (
      domain === 'ticketing' &&
      (operationKey === 'ticket_booking_prepare' ||
        operationKey === 'ticket_booking_submit')
    ) {
      const missing: string[] = [];
      if (!slots.route) {
        missing.push('route');
      }
      if (!slots.date) {
        missing.push('date');
      }
      return missing;
    }

    return [];
  }

  private requiresConfirmation(
    plan: ActionPlanValue,
    rules: ActionRuntimeRulesValue,
  ) {
    if (
      rules.policy.autoExecuteRiskLevels.includes(plan.riskLevel) &&
      rules.policy.trustedOperationKeys.includes(plan.operationKey)
    ) {
      return false;
    }
    return plan.requiresConfirmation;
  }

  private matchesKeyword(message: string, keywords: string[]) {
    return keywords.some((keyword) => message.includes(keyword));
  }

  private executeMockOperation(
    plan: ActionPlanValue,
    connector: ActionConnectorEntity | undefined,
    previewOnly: boolean,
  ): ActionExecutionResultValue {
    if (plan.operationKey === 'smart_home_control') {
      const room = (plan.slots.room as string | undefined) ?? '默认房间';
      const device = (plan.slots.device as string | undefined) ?? '设备';
      const action = plan.slots.action as string | undefined;
      const temperatureCelsius = plan.slots.temperatureCelsius as
        | number
        | undefined;
      const actionSummary =
        action === 'turn_on'
          ? '已打开'
          : action === 'turn_off'
            ? '已关闭'
            : action === 'set_temperature'
              ? `已调到 ${temperatureCelsius ?? '--'} 度`
              : '已更新';
      return {
        resultSummary: `${room}的${device}${actionSummary}`,
        executionPayload: {
          providerType: connector?.providerType ?? 'mock',
          previewOnly,
          simulatedState: {
            room,
            device,
            action,
            temperatureCelsius,
          },
        },
        resultPayload: {
          room,
          device,
          action,
          temperatureCelsius,
        },
      };
    }

    if (plan.operationKey === 'food_delivery_prepare') {
      const preference =
        (plan.slots.preference as string | undefined) ?? '家常简餐';
      const budgetCny =
        (plan.slots.budgetCny as number | undefined) ?? 48;
      return {
        resultSummary: `我先整理了 3 家适合「${preference}」的 mock 外卖，预算控制在 ${budgetCny} 元内，预计 30 分钟左右送达。`,
        executionPayload: {
          providerType: connector?.providerType ?? 'mock',
          previewOnly,
          recommendationCount: 3,
        },
        resultPayload: {
          options: [
            { shop: 'Mock 轻食厨房', estimateMinutes: 26, priceCny: budgetCny - 6 },
            { shop: 'Mock 便当站', estimateMinutes: 31, priceCny: budgetCny - 10 },
            { shop: 'Mock 快手热食', estimateMinutes: 34, priceCny: budgetCny - 4 },
          ],
        },
      };
    }

    if (plan.operationKey === 'food_delivery_submit') {
      const preference = plan.slots.preference as string;
      const address = plan.slots.address as string;
      const orderRef = previewOnly ? 'PREVIEW-ORDER' : createMockReference('order');
      return {
        resultSummary: `我已经按「${preference}」生成了一笔 mock 外卖订单，送达地址是「${address}」，参考单号 ${orderRef}。`,
        executionPayload: {
          providerType: connector?.providerType ?? 'mock',
          previewOnly,
          submittedAt: new Date().toISOString(),
          orderRef,
        },
        resultPayload: {
          orderRef,
          address,
          etaMinutes: 32,
          totalCny: 42,
        },
      };
    }

    if (plan.operationKey === 'ticket_booking_prepare') {
      const route = plan.slots.route as string;
      const date = plan.slots.date as string;
      return {
        resultSummary: `我先整理了 ${route} 在 ${date} 的 3 个 mock 票务方案，暂时还没有提交预订。`,
        executionPayload: {
          providerType: connector?.providerType ?? 'mock',
          previewOnly,
          optionCount: 3,
        },
        resultPayload: {
          route,
          date,
          options: [
            { departAt: '09:15', arriveAt: '11:40', priceCny: 398 },
            { departAt: '13:30', arriveAt: '15:55', priceCny: 438 },
            { departAt: '18:20', arriveAt: '20:45', priceCny: 416 },
          ],
        },
      };
    }

    if (plan.operationKey === 'ticket_booking_submit') {
      const route = plan.slots.route as string;
      const date = plan.slots.date as string;
      const reservationRef = previewOnly
        ? 'PREVIEW-RESERVATION'
        : createMockReference('ticket');
      return {
        resultSummary: `我已经生成了一笔 ${route} / ${date} 的 mock 票务预订，参考编号 ${reservationRef}。`,
        executionPayload: {
          providerType: connector?.providerType ?? 'mock',
          previewOnly,
          reservationRef,
        },
        resultPayload: {
          route,
          date,
          reservationRef,
          totalCny: 438,
        },
      };
    }

    throw new Error(`Unsupported mock operation: ${plan.operationKey}`);
  }

  private renderClarification(
    plan: ActionPlanValue,
    rules: ActionRuntimeRulesValue,
  ) {
    return renderTemplate(rules.promptTemplates.clarificationTemplate, {
      title: plan.title,
      missingSlots: plan.missingSlots
        .map((slot) => this.humanizeSlotName(slot))
        .join('、'),
    });
  }

  private renderConfirmation(
    plan: ActionPlanValue,
    rules: ActionRuntimeRulesValue,
  ) {
    return renderTemplate(rules.promptTemplates.confirmationTemplate, {
      title: plan.title,
      slotSummary: this.describeSlots(plan.slots),
    });
  }

  private renderSuccess(
    plan: ActionPlanValue,
    connectorName: string,
    resultSummary: string,
    rules: ActionRuntimeRulesValue,
  ) {
    return renderTemplate(rules.promptTemplates.successTemplate, {
      connectorName,
      title: plan.title,
      resultSummary,
    });
  }

  private renderFailure(
    plan: ActionPlanValue,
    errorMessage: string,
    rules: ActionRuntimeRulesValue,
  ) {
    return renderTemplate(rules.promptTemplates.failureTemplate, {
      title: plan.title,
      errorMessage,
    });
  }

  private renderCancelled(
    plan: ActionPlanValue,
    rules: ActionRuntimeRulesValue,
  ) {
    return renderTemplate(rules.promptTemplates.cancelledTemplate, {
      title: plan.title,
    });
  }

  private humanizeSlotName(slot: string) {
    switch (slot) {
      case 'device':
        return '设备';
      case 'action':
        return '控制动作';
      case 'temperatureCelsius':
        return '目标温度';
      case 'preference':
        return '想吃什么';
      case 'address':
        return '送达地址';
      case 'route':
        return '出发地和目的地';
      case 'date':
        return '日期/时间';
      default:
        return slot;
    }
  }

  private describeSlots(slots: Record<string, unknown>) {
    const entries = Object.entries(slots);
    if (!entries.length) {
      return '暂时还没有稳定参数';
    }
    return entries
      .map(([key, value]) => `${this.humanizeSlotName(key)}：${this.humanizeSlotValue(key, value)}`)
      .join('；');
  }

  private humanizeSlotValue(key: string, value: unknown) {
    if (key === 'action') {
      if (value === 'turn_on') {
        return '打开';
      }
      if (value === 'turn_off') {
        return '关闭';
      }
      if (value === 'set_temperature') {
        return '调温';
      }
    }
    return String(value);
  }

  private findOperation(
    connector: ActionConnectorEntity | ActionConnectorSeedValue,
    operationKey: string,
  ) {
    return (connector.capabilitiesPayload ?? []).find(
      (operation) => operation.operationKey === operationKey,
    );
  }

  private serializeConnector(connector: ActionConnectorEntity) {
    return {
      id: connector.id,
      connectorKey: connector.connectorKey,
      displayName: connector.displayName,
      providerType: connector.providerType,
      status: connector.status,
      endpointConfig: connector.endpointConfigPayload ?? null,
      credentialConfigured: Boolean(
        connector.credentialPayloadEncrypted?.trim(),
      ),
      capabilities: [...(connector.capabilitiesPayload ?? [])],
      lastHealthCheckAt: connector.lastHealthCheckAt?.toISOString() ?? null,
      lastError: connector.lastError ?? null,
      updatedAt: connector.updatedAt.toISOString(),
    };
  }

  private serializeRun(run: ActionRunEntity) {
    return {
      id: run.id,
      conversationId: run.conversationId,
      ownerId: run.ownerId,
      characterId: run.characterId,
      connectorKey: run.connectorKey,
      operationKey: run.operationKey,
      status: run.status,
      title: run.title,
      userGoal: run.userGoal,
      riskLevel: run.riskLevel,
      requiresConfirmation: run.requiresConfirmation,
      slotPayload: run.slotPayload ?? {},
      missingSlots: run.missingSlots ?? [],
      resultSummary: run.resultSummary ?? null,
      errorMessage: run.errorMessage ?? null,
      updatedAt: run.updatedAt.toISOString(),
      createdAt: run.createdAt.toISOString(),
    };
  }

  private serializeRunDetail(run: ActionRunEntity) {
    return {
      ...this.serializeRun(run),
      planPayload: run.planPayload ?? null,
      policyDecisionPayload: run.policyDecisionPayload ?? null,
      confirmationPayload: run.confirmationPayload ?? null,
      executionPayload: run.executionPayload ?? null,
      resultPayload: run.resultPayload ?? null,
      errorPayload: run.errorPayload ?? null,
      tracePayload: run.tracePayload ?? null,
    };
  }
}
