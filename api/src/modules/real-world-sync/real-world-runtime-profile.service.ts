import { Injectable } from '@nestjs/common';
import type {
  PersonalityProfile,
  SceneKey,
  ScenePrompts,
} from '../ai/ai.types';
import type { CharacterEntity } from '../characters/character.entity';
import { RealWorldSyncService } from './real-world-sync.service';

const SCENE_KEYS: SceneKey[] = [
  'chat',
  'moments_post',
  'moments_comment',
  'feed_post',
  'channel_post',
  'feed_comment',
  'greeting',
  'proactive',
];

function mergeScenePromptText(basePrompt?: string, overlayPrompt?: string) {
  const normalizedBase = basePrompt?.trim() ?? '';
  const normalizedOverlay = overlayPrompt?.trim() ?? '';

  if (!normalizedBase && !normalizedOverlay) {
    return '';
  }
  if (!normalizedBase) {
    return normalizedOverlay;
  }
  if (!normalizedOverlay) {
    return normalizedBase;
  }

  return `${normalizedBase}\n\n【今日现实补丁】\n${normalizedOverlay}`;
}

function cloneScenePrompts(
  scenePrompts?: ScenePrompts,
): ScenePrompts | undefined {
  if (!scenePrompts) {
    return undefined;
  }

  return {
    ...scenePrompts,
  };
}

function cloneProfile(profile: PersonalityProfile): PersonalityProfile {
  return {
    ...profile,
    expertDomains: [...(profile.expertDomains ?? [])],
    scenePrompts: cloneScenePrompts(profile.scenePrompts),
    traits: {
      ...profile.traits,
      speechPatterns: [...(profile.traits?.speechPatterns ?? [])],
      catchphrases: [...(profile.traits?.catchphrases ?? [])],
      topicsOfInterest: [...(profile.traits?.topicsOfInterest ?? [])],
    },
    identity: profile.identity
      ? {
          ...profile.identity,
        }
      : undefined,
    behavioralPatterns: profile.behavioralPatterns
      ? {
          ...profile.behavioralPatterns,
          taboos: [...(profile.behavioralPatterns.taboos ?? [])],
          quirks: [...(profile.behavioralPatterns.quirks ?? [])],
        }
      : undefined,
    cognitiveBoundaries: profile.cognitiveBoundaries
      ? {
          ...profile.cognitiveBoundaries,
        }
      : undefined,
    reasoningConfig: profile.reasoningConfig
      ? {
          ...profile.reasoningConfig,
        }
      : undefined,
    memory: profile.memory
      ? {
          ...profile.memory,
        }
      : undefined,
    realWorldContext: profile.realWorldContext
      ? {
          ...profile.realWorldContext,
          sceneOverlays: cloneScenePrompts(
            profile.realWorldContext.sceneOverlays,
          ),
          signalTitles: [...(profile.realWorldContext.signalTitles ?? [])],
        }
      : undefined,
  };
}

function mergeScenePrompts(
  baseScenePrompts?: ScenePrompts,
  overlayScenePrompts?: ScenePrompts,
) {
  if (!baseScenePrompts && !overlayScenePrompts) {
    return undefined;
  }

  const nextScenePrompts: ScenePrompts = {
    ...(baseScenePrompts ?? {}),
  };
  let changed = false;

  for (const sceneKey of SCENE_KEYS) {
    const mergedPrompt = mergeScenePromptText(
      baseScenePrompts?.[sceneKey],
      overlayScenePrompts?.[sceneKey],
    );
    if (!mergedPrompt) {
      continue;
    }

    nextScenePrompts[sceneKey] = mergedPrompt;
    if (mergedPrompt !== baseScenePrompts?.[sceneKey]) {
      changed = true;
    }
  }

  return changed ? nextScenePrompts : baseScenePrompts;
}

@Injectable()
export class RealWorldRuntimeProfileService {
  constructor(private readonly realWorldSync: RealWorldSyncService) {}

  async buildRuntimeProfileFromCharacter(
    character: Pick<CharacterEntity, 'id' | 'profile'> | null | undefined,
  ): Promise<PersonalityProfile | undefined> {
    if (!character?.profile) {
      return undefined;
    }

    const baseProfile = cloneProfile(character.profile);
    const runtimeContext = await this.realWorldSync.resolveRuntimeContext(
      character.id,
    );
    if (!runtimeContext) {
      return baseProfile;
    }

    return {
      ...baseProfile,
      realWorldContext: runtimeContext,
      scenePrompts: mergeScenePrompts(
        baseProfile.scenePrompts,
        runtimeContext.sceneOverlays,
      ),
    };
  }
}
