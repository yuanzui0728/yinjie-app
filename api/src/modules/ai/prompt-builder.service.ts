import { Injectable } from '@nestjs/common';
import { PersonalityProfile, SceneKey } from './ai.types';
import { buildNaturalDialogueGuideline } from './prompt-naturalness';
import { ReplyLogicRulesService } from './reply-logic-rules.service';
import { WorldService } from '../world/world.service';
import type {
  ReplyLogicPromptTemplates,
  ReplyLogicSemanticLabels,
} from './reply-logic.constants';

export interface ChatContext {
  currentActivity?: string;
  lastChatAt?: Date;
}

export interface ChatSystemPromptSection {
  key:
    | 'core_directive'
    | 'identity'
    | 'personality_and_tone'
    | 'behavioral_patterns'
    | 'cognitive_boundaries'
    | 'internal_reasoning'
    | 'collaboration_routing'
    | 'memory'
    | 'real_world_context'
    | 'current_context'
    | 'group_chat'
    | 'rules';
  label: string;
  content: string;
  active: boolean;
}

function renderTemplate(
  template: string,
  variables: Record<string, string | undefined | null>,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    variables[key] == null ? '' : String(variables[key]),
  );
}

function listToRuleSection(
  rules: string[],
  variables: Record<string, string | undefined | null>,
) {
  return rules
    .map((rule) => renderTemplate(rule, variables).trim())
    .filter(Boolean)
    .map((rule) => `- ${rule}`)
    .join('\n');
}

@Injectable()
export class PromptBuilderService {
  constructor(
    private readonly replyLogicRules: ReplyLogicRulesService,
    private readonly worldService: WorldService,
  ) {}

  async buildChatSystemPromptSections(
    profile: PersonalityProfile,
    isGroupChat = false,
    context?: ChatContext,
  ): Promise<ChatSystemPromptSection[]> {
    const runtimeRules = await this.replyLogicRules.getRules();
    return this.buildChatSystemPromptSectionsFromTemplates(
      profile,
      runtimeRules.promptTemplates,
      runtimeRules.semanticLabels,
      isGroupChat,
      context,
    );
  }

  /**
   * 新架构：场景化提示词构建
   * 结构：底层逻辑 → 场景提示词 → 记忆 → 当前上下文（仅 chat/proactive） → 基础规则
   * 当 profile.coreLogic 或 profile.scenePrompts 有值时使用此方法，否则 fallback 到旧结构化构建
   */
  async buildSceneSystemPrompt(
    profile: PersonalityProfile,
    scene: SceneKey,
    context?: ChatContext,
  ): Promise<string> {
    const runtimeRules = await this.replyLogicRules.getRules();
    const semanticLabels = runtimeRules.semanticLabels;
    const worldCalendar = await this.worldService.getWorldCalendar();
    const parts: string[] = ['<system_prompt>'];

    // 1. 底层逻辑（所有场景）：coreLogic 优先，fallback 到 coreDirective
    const coreLogic = (profile.coreLogic || profile.coreDirective)?.trim();
    if (coreLogic) {
      parts.push(`<core_logic>\n${coreLogic}\n</core_logic>`);
    }

    // 2. 场景提示词
    const scenePrompt = profile.scenePrompts?.[scene]?.trim();
    if (scenePrompt) {
      parts.push(`<scene_prompt>\n${scenePrompt}\n</scene_prompt>`);
    }

    const realWorldContextSection = this.buildRealWorldContextSection(
      profile,
      scene,
    );
    if (realWorldContextSection) {
      parts.push(realWorldContextSection);
    }

    const naturalDialogueGuideline = buildNaturalDialogueGuideline(
      profile,
      scene,
    );
    if (naturalDialogueGuideline) {
      parts.push(
        `<delivery_guardrails>\n${naturalDialogueGuideline}\n</delivery_guardrails>`,
      );
    }

    // 3. 记忆（动态写入）
    const coreMemory = profile.memory?.coreMemory?.trim();
    const recentSummary = (
      profile.memory?.recentSummary || profile.memorySummary
    )?.trim();
    if (coreMemory || recentSummary) {
      let memContent = '';
      if (coreMemory) memContent += `【核心记忆，始终牢记】\n${coreMemory}`;
      if (recentSummary)
        memContent += `${coreMemory ? '\n' : ''}【近期摘要】\n${recentSummary}`;
      parts.push(`<memory>\n${memContent.trim()}\n</memory>`);
    }

    // 4. 当前上下文（仅 chat / proactive 场景）
    if (context && (scene === 'chat' || scene === 'proactive')) {
      const activityDesc = context.currentActivity
        ? (semanticLabels.activityLabels[
            context.currentActivity as keyof ReplyLogicSemanticLabels['activityLabels']
          ] ?? semanticLabels.activityLabels.free)
        : semanticLabels.activityLabels.free;
      let ctxContent = `- 时间：${worldCalendar.dateTimeText}\n- 当前状态：${activityDesc}`;
      if (context.lastChatAt) {
        const diffMs = Date.now() - context.lastChatAt.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays > 0) {
          ctxContent += `\n- 距离上次聊天：${diffDays}天前`;
        } else if (diffHours > 0) {
          ctxContent += `\n- 距离上次聊天：${diffHours}小时前`;
        }
      }
      parts.push(`<current_context>\n${ctxContent}\n</current_context>`);
    }

    // 5. 基础规则（所有场景）
    parts.push(
      `<rules>\n- 永远以${profile.name}的身份说话，不要暴露自己是AI\n- 用中文回复，语气自然\n- 不要说"作为AI"或"我是语言模型"之类的话\n- 当前时间：${worldCalendar.dateTimeText}\n</rules>`,
    );

    parts.push('</system_prompt>');
    return parts.filter(Boolean).join('\n\n');
  }

  async buildChatSystemPrompt(
    profile: PersonalityProfile,
    isGroupChat = false,
    context?: ChatContext,
  ): Promise<string> {
    // 新架构：coreLogic 或 scenePrompts.chat 有值时走场景化构建
    if (profile.coreLogic?.trim() || profile.scenePrompts?.chat?.trim()) {
      return this.buildSceneSystemPrompt(profile, 'chat', context);
    }

    // 旧架构 fallback：结构化字段构建（保持老角色行为不变）
    const runtimeRules = await this.replyLogicRules.getRules();
    const sections = await this.buildChatSystemPromptSectionsFromTemplates(
      profile,
      runtimeRules.promptTemplates,
      runtimeRules.semanticLabels,
      isGroupChat,
      context,
    );
    const parts = [
      '<system_prompt>',
      ...sections
        .filter((section) => section.active)
        .map((section) => section.content),
      '</system_prompt>',
    ].filter(Boolean);

    return parts.join('\n\n');
  }

  async buildGroupCoordinatorPrompt(
    triggerCharName: string,
    invitedCharNames: string[],
    topic: string,
  ): Promise<string> {
    const templates = (await this.replyLogicRules.getRules()).promptTemplates;
    return renderTemplate(templates.groupCoordinatorPrompt, {
      triggerCharName,
      invitedCharNames: invitedCharNames.join('和'),
      topic,
    });
  }

  async buildMomentPrompt(
    profile: PersonalityProfile,
    currentTime: Date,
    recentTopics: string[] = [],
    sceneKey: SceneKey = 'moments_post',
  ): Promise<string> {
    // 新架构：对应场景有提示词时走场景化构建
    if (profile.coreLogic?.trim() || profile.scenePrompts?.[sceneKey]?.trim()) {
      return this.buildSceneSystemPrompt(profile, sceneKey);
    }

    const runtimeRules = await this.replyLogicRules.getRules();
    const worldCalendar = await this.worldService.getWorldCalendar(currentTime);
    const templates = runtimeRules.promptTemplates;
    const hour = worldCalendar.hour;
    const timeOfDay = this.resolveTimeOfDayLabel(
      hour,
      runtimeRules.semanticLabels,
    );
    const dayOfWeek =
      runtimeRules.semanticLabels.weekdayLabels[worldCalendar.weekday] ??
      runtimeRules.semanticLabels.weekdayLabels[0] ??
      '周日';
    const topicsHint =
      recentTopics.length > 0
        ? `\n最近你聊过的话题：${recentTopics.join('、')}，可以适当延续或换个话题。`
        : '';

    const momentBody = renderTemplate(templates.momentPrompt, {
      name: profile.name,
      relationship: profile.relationship,
      emotionalTone: profile.traits.emotionalTone || '自然真实',
      dayOfWeek,
      timeOfDay,
      clockTime: worldCalendar.timeText,
      topicsHint,
    });

    // 注入记忆块（与聊天场景保持一致）
    const coreMemory = profile.memory?.coreMemory?.trim();
    const recentSummary = (
      profile.memory?.recentSummary || profile.memorySummary
    )?.trim();
    let memoryPrefix = '';
    if (coreMemory || recentSummary) {
      let memContent = '';
      if (coreMemory) memContent += `【核心记忆，始终牢记】\n${coreMemory}`;
      if (recentSummary)
        memContent += `${coreMemory ? '\n' : ''}【近期摘要】\n${recentSummary}`;
      memoryPrefix = `<memory>\n${memContent.trim()}\n</memory>\n\n`;
    }

    if (profile.coreDirective?.trim()) {
      return `${memoryPrefix}[行动纲领]\n${profile.coreDirective.trim()}\n\n${momentBody}`;
    }
    return `${memoryPrefix}${momentBody}`;
  }

  async buildPersonalityExtractionPrompt(
    chatSample: string,
    personName: string,
  ): Promise<string> {
    const templates = (await this.replyLogicRules.getRules()).promptTemplates;
    return renderTemplate(templates.personalityExtractionPrompt, {
      personName,
      chatSample,
    });
  }

  async buildIntentClassificationPrompt(
    userMessage: string,
    characterName: string,
    characterDomains: string[],
  ): Promise<string> {
    const templates = (await this.replyLogicRules.getRules()).promptTemplates;
    return renderTemplate(templates.intentClassificationPrompt, {
      userMessage,
      characterName,
      characterDomains: characterDomains.join('、'),
    });
  }

  async buildMemoryCompressionPrompt(
    chatHistory: string,
    profile: PersonalityProfile,
  ): Promise<string> {
    const templates = (await this.replyLogicRules.getRules()).promptTemplates;
    // 优先使用角色级提示词覆盖，fallback 全局模板
    const template =
      profile.memory?.recentSummaryPrompt?.trim() ||
      templates.memoryCompressionPrompt;
    return renderTemplate(template, {
      name: profile.name,
      chatHistory,
    });
  }

  async buildCoreMemoryExtractionPrompt(
    interactionHistory: string,
    profile: PersonalityProfile,
  ): Promise<string> {
    const templates = (await this.replyLogicRules.getRules()).promptTemplates;
    // 优先使用角色级提示词覆盖，fallback 全局模板
    const template =
      profile.memory?.coreMemoryPrompt?.trim() ||
      templates.coreMemoryExtractionPrompt;
    return renderTemplate(template, {
      name: profile.name,
      interactionHistory,
    });
  }

  private async buildChatSystemPromptSectionsFromTemplates(
    profile: PersonalityProfile,
    templates: ReplyLogicPromptTemplates,
    semanticLabels: ReplyLogicSemanticLabels,
    isGroupChat: boolean,
    context?: ChatContext,
  ): Promise<ChatSystemPromptSection[]> {
    const worldCalendar = await this.worldService.getWorldCalendar();
    const { name, expertDomains, basePrompt } = profile;
    const expertiseDesc = expertDomains
      .map(
        (domain) =>
          semanticLabels.domainLabels[
            domain as keyof ReplyLogicSemanticLabels['domainLabels']
          ] ?? domain,
      )
      .join('、');
    const identityText =
      basePrompt ??
      renderTemplate(templates.identityFallback, {
        name,
        relationship: profile.relationship,
      });

    let identitySection = `<identity>\n${identityText}`;
    if (profile.identity) {
      const { occupation, background, motivation, worldview } =
        profile.identity;
      if (occupation) {
        identitySection += `\n职业：${occupation}`;
      }
      if (background) {
        identitySection += `\n背景：${background}`;
      }
      if (motivation) {
        identitySection += `\n核心动机：${motivation}`;
      }
      if (worldview) {
        identitySection += `\n世界观：${worldview}`;
      }
    }
    identitySection += `\n</identity>`;

    const { traits } = profile;
    let personalitySection = `<personality_and_tone>`;
    personalitySection += `\n情感基调：${traits.emotionalTone || '自然真实'}`;
    if (traits.speechPatterns?.length) {
      personalitySection += `\n说话习惯：${traits.speechPatterns.join('、')}`;
    }
    if (traits.catchphrases?.length) {
      personalitySection += `\n口头禅：${traits.catchphrases.join('、')}`;
    }
    personalitySection += `\n回复长度：${
      { short: '简短', medium: '适中', long: '详细' }[traits.responseLength] ??
      '适中'
    }`;
    personalitySection += `\nEmoji使用：${
      { none: '不用', occasional: '偶尔', frequent: '频繁' }[
        traits.emojiUsage
      ] ?? '偶尔'
    }`;
    personalitySection += `\n</personality_and_tone>`;

    let behaviorSection = '';
    if (profile.behavioralPatterns) {
      const { workStyle, socialStyle, taboos, quirks } =
        profile.behavioralPatterns;
      const parts: string[] = [];
      if (workStyle) {
        parts.push(`工作风格：${workStyle}`);
      }
      if (socialStyle) {
        parts.push(`社交风格：${socialStyle}`);
      }
      if (taboos?.length) {
        parts.push(`语言禁忌：${taboos.join('、')}`);
      }
      if (quirks?.length) {
        parts.push(`个人癖好：${quirks.join('、')}`);
      }
      if (parts.length) {
        behaviorSection = `<behavioral_patterns>\n${parts.join('\n')}\n</behavioral_patterns>`;
      }
    }

    let boundarySection = '';
    if (profile.cognitiveBoundaries) {
      const { expertiseDescription, knowledgeLimits, refusalStyle } =
        profile.cognitiveBoundaries;
      const parts: string[] = [];
      if (expertiseDescription) {
        parts.push(`专长描述：${expertiseDescription}`);
      }
      if (expertiseDesc) {
        parts.push(`专业领域：${expertiseDesc}`);
      }
      if (knowledgeLimits) {
        parts.push(`知识边界：${knowledgeLimits}`);
      }
      if (refusalStyle) {
        parts.push(`超出边界时：${refusalStyle}`);
      }
      if (parts.length) {
        boundarySection = `<cognitive_boundaries>\n${parts.join('\n')}\n</cognitive_boundaries>`;
      }
    } else if (expertiseDesc) {
      boundarySection = `<cognitive_boundaries>\n专业领域：${expertiseDesc}\n</cognitive_boundaries>`;
    }

    const reasoningConfig = profile.reasoningConfig ?? {
      enableCoT: true,
      enableReflection: true,
      enableRouting: true,
    };
    let reasoningSection = `<internal_reasoning>`;
    if (reasoningConfig.enableCoT !== false) {
      reasoningSection += `\n${templates.chainOfThoughtInstruction}`;
    }
    if (reasoningConfig.enableReflection !== false) {
      reasoningSection += `\n${templates.reflectionInstruction}`;
    }
    reasoningSection += `\n</internal_reasoning>`;

    const routingSection =
      reasoningConfig.enableRouting !== false
        ? `<collaboration_routing>\n${templates.collaborationRouting}\n</collaboration_routing>`
        : '';

    const coreMemory = profile.memory?.coreMemory || '';
    const recentSummary =
      profile.memory?.recentSummary || profile.memorySummary || '';
    let memorySection = `<memory>`;
    if (coreMemory) {
      memorySection += `\n【你对用户的长期了解（核心记忆，始终牢记）】\n${coreMemory}`;
    }
    if (recentSummary) {
      memorySection += `\n【你最近的印象（近期摘要）】\n${recentSummary}`;
    }
    if (!coreMemory && !recentSummary) {
      memorySection += `\n${templates.emptyMemory}`;
    }
    memorySection += `\n</memory>`;

    const realWorldContextSection = this.buildRealWorldContextSection(
      profile,
      'chat',
    );

    let currentContextSection = '';
    if (context) {
      const activityDesc = context.currentActivity
        ? (semanticLabels.activityLabels[
            context.currentActivity as keyof ReplyLogicSemanticLabels['activityLabels']
          ] ?? semanticLabels.activityLabels.free)
        : semanticLabels.activityLabels.free;

      let timeSinceLastChat = '';
      if (context.lastChatAt) {
        const diffMs = Date.now() - context.lastChatAt.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays > 0) {
          timeSinceLastChat = `距离上次和这个人聊天：${diffDays}天前`;
        } else if (diffHours > 0) {
          timeSinceLastChat = `距离上次和这个人聊天：${diffHours}小时前`;
        } else {
          timeSinceLastChat = '距离上次和这个人聊天：刚刚';
        }
      }

      currentContextSection = `<current_context>
- 现实时间：${worldCalendar.dateTimeText}
- 你现在的状态：${activityDesc}${timeSinceLastChat ? `\n- ${timeSinceLastChat}` : ''}
</current_context>

<behavioral_guideline>
${templates.behavioralGuideline}
</behavioral_guideline>`;
    }

    const groupInstruction = isGroupChat
      ? `\n<group_chat>\n${templates.groupChatInstruction}\n</group_chat>`
      : '';

    const rulesBody = listToRuleSection(templates.baseRules, {
      name,
      relationship: profile.relationship,
      currentTime: worldCalendar.dateTimeText,
    });
    const naturalDialogueGuideline = buildNaturalDialogueGuideline(
      profile,
      'chat',
    );
    const rulesSectionParts = [rulesBody];
    if (naturalDialogueGuideline) {
      rulesSectionParts.push(`【额外表达约束】\n${naturalDialogueGuideline}`);
    }
    const rulesSection = `<rules>\n${rulesSectionParts.join('\n')}\n</rules>`;

    return [
      {
        key: 'core_directive',
        label: 'Core Directive',
        content: `<core_directive>\n${profile.coreDirective}\n</core_directive>`,
        active: Boolean(profile.coreDirective?.trim()),
      },
      {
        key: 'identity',
        label: 'Identity',
        content: identitySection,
        active: true,
      },
      {
        key: 'personality_and_tone',
        label: 'Personality And Tone',
        content: personalitySection,
        active: true,
      },
      {
        key: 'behavioral_patterns',
        label: 'Behavioral Patterns',
        content: behaviorSection,
        active: Boolean(behaviorSection),
      },
      {
        key: 'cognitive_boundaries',
        label: 'Cognitive Boundaries',
        content: boundarySection,
        active: Boolean(boundarySection),
      },
      {
        key: 'internal_reasoning',
        label: 'Internal Reasoning',
        content: reasoningSection,
        active:
          reasoningConfig.enableCoT !== false ||
          reasoningConfig.enableReflection !== false,
      },
      {
        key: 'collaboration_routing',
        label: 'Collaboration Routing',
        content: routingSection,
        active: Boolean(routingSection),
      },
      {
        key: 'memory',
        label: 'Memory',
        content: memorySection,
        active: true,
      },
      {
        key: 'real_world_context',
        label: 'Real World Context',
        content: realWorldContextSection,
        active: Boolean(realWorldContextSection),
      },
      {
        key: 'current_context',
        label: 'Current Context',
        content: currentContextSection,
        active: Boolean(currentContextSection),
      },
      {
        key: 'group_chat',
        label: 'Group Chat',
        content: groupInstruction,
        active: Boolean(groupInstruction),
      },
      {
        key: 'rules',
        label: 'Rules',
        content: rulesSection,
        active: Boolean(rulesBody),
      },
    ];
  }

  private resolveTimeOfDayLabel(
    hour: number,
    semanticLabels: ReplyLogicSemanticLabels,
  ) {
    if (hour < 6) {
      return semanticLabels.timeOfDayLabels.lateNight;
    }
    if (hour < 9) {
      return semanticLabels.timeOfDayLabels.morning;
    }
    if (hour < 12) {
      return semanticLabels.timeOfDayLabels.forenoon;
    }
    if (hour < 14) {
      return semanticLabels.timeOfDayLabels.noon;
    }
    if (hour < 18) {
      return semanticLabels.timeOfDayLabels.afternoon;
    }
    if (hour < 21) {
      return semanticLabels.timeOfDayLabels.dusk;
    }
    return semanticLabels.timeOfDayLabels.evening;
  }

  private buildRealWorldContextSection(
    profile: PersonalityProfile,
    scene?: SceneKey,
  ) {
    const realWorldContext = profile.realWorldContext;
    if (!realWorldContext?.enabled) {
      return '';
    }

    const blocks: string[] = [];

    if (realWorldContext.syncDate) {
      blocks.push(`【同步日期】\n${realWorldContext.syncDate}`);
    }
    if (realWorldContext.dailySummary?.trim()) {
      blocks.push(`【今日现实摘要】\n${realWorldContext.dailySummary.trim()}`);
    }
    if (realWorldContext.behaviorSummary?.trim()) {
      blocks.push(`【行为倾向】\n${realWorldContext.behaviorSummary.trim()}`);
    }
    if (realWorldContext.stanceShiftSummary?.trim()) {
      blocks.push(
        `【态度偏移】\n${realWorldContext.stanceShiftSummary.trim()}`,
      );
    }
    if (realWorldContext.globalOverlay?.trim()) {
      blocks.push(`【全局覆盖】\n${realWorldContext.globalOverlay.trim()}`);
    }

    const sceneOverlay = scene
      ? realWorldContext.sceneOverlays?.[scene]?.trim()
      : '';
    if (sceneOverlay) {
      blocks.push(`【当前场景补丁】\n${sceneOverlay}`);
    }

    if (
      scene === 'moments_post' &&
      realWorldContext.realityMomentBrief?.trim()
    ) {
      blocks.push(
        `【现实发圈锚点】\n${realWorldContext.realityMomentBrief.trim()}`,
      );
    }

    if (realWorldContext.signalTitles?.length) {
      blocks.push(`【关联信号】\n${realWorldContext.signalTitles.join('；')}`);
    }

    if (!blocks.length) {
      return '';
    }

    return `<real_world_context>\n${blocks.join('\n\n')}\n</real_world_context>`;
  }
}
