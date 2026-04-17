import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CharacterBlueprintService } from '../characters/character-blueprint.service';
import { CharactersService } from '../characters/characters.service';
import { AppEvents, EventBusService } from '../events/event-bus.service';
import { NeedDiscoveryCandidateEntity } from './need-discovery-candidate.entity';
import { NeedDiscoveryConfigService } from './need-discovery-config.service';
import type {
  NeedDiscoveryFriendRequestAcceptedEvent,
  NeedDiscoveryFriendRequestDeclinedEvent,
  NeedDiscoveryFriendRequestExpiredEvent,
} from './need-discovery.types';

@Injectable()
export class NeedDiscoveryLifecycleService {
  private readonly logger = new Logger(NeedDiscoveryLifecycleService.name);

  constructor(
    @InjectRepository(NeedDiscoveryCandidateEntity)
    private readonly candidateRepo: Repository<NeedDiscoveryCandidateEntity>,
    private readonly eventBus: EventBusService,
    private readonly configService: NeedDiscoveryConfigService,
    private readonly characterBlueprintService: CharacterBlueprintService,
    private readonly charactersService: CharactersService,
  ) {
    this.eventBus.on(AppEvents.FRIEND_REQUEST_ACCEPTED, (payload) => {
      void this.handleAccepted(payload as NeedDiscoveryFriendRequestAcceptedEvent);
    });
    this.eventBus.on(AppEvents.FRIEND_REQUEST_DECLINED, (payload) => {
      void this.handleDeclined(payload as NeedDiscoveryFriendRequestDeclinedEvent);
    });
    this.eventBus.on(AppEvents.FRIEND_REQUEST_EXPIRED, (payload) => {
      void this.handleExpired(payload as NeedDiscoveryFriendRequestExpiredEvent);
    });
  }

  private async handleAccepted(
    payload: NeedDiscoveryFriendRequestAcceptedEvent,
  ) {
    const candidate = await this.candidateRepo.findOneBy({
      friendRequestId: payload.requestId,
    });
    if (!candidate) {
      return;
    }

    candidate.status = 'accepted';
    candidate.acceptedAt = payload.acceptedAt;
    await this.candidateRepo.save(candidate);

    if (candidate.characterId) {
      await this.characterBlueprintService.syncPublishedRecipeToRuntime(
        candidate.characterId,
      );
    }
  }

  private async handleDeclined(
    payload: NeedDiscoveryFriendRequestDeclinedEvent,
  ) {
    const candidate = await this.candidateRepo.findOneBy({
      friendRequestId: payload.requestId,
    });
    if (!candidate) {
      return;
    }

    const config = await this.configService.getConfig();
    candidate.status = 'declined';
    candidate.declinedAt = payload.declinedAt;
    candidate.suppressedUntil = addDays(
      payload.declinedAt,
      candidate.cadenceType === 'daily'
        ? config.shared.dailySuppressionDays
        : config.shared.shortSuppressionDays,
    );
    await this.candidateRepo.save(candidate);

    if (candidate.characterId) {
      try {
        await this.charactersService.delete(candidate.characterId);
        candidate.deletedAt = new Date();
        await this.candidateRepo.save(candidate);
      } catch (error) {
        this.logger.warn('Failed to delete declined need-generated character', {
          characterId: candidate.characterId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async handleExpired(payload: NeedDiscoveryFriendRequestExpiredEvent) {
    const candidate = await this.candidateRepo.findOneBy({
      friendRequestId: payload.requestId,
    });
    if (!candidate) {
      return;
    }

    const config = await this.configService.getConfig();
    candidate.status = 'expired';
    candidate.suppressedUntil = addDays(
      payload.expiredAt,
      candidate.cadenceType === 'daily'
        ? config.shared.dailySuppressionDays
        : config.shared.shortSuppressionDays,
    );
    await this.candidateRepo.save(candidate);

    if (candidate.characterId) {
      try {
        await this.charactersService.delete(candidate.characterId);
        candidate.deletedAt = new Date();
        await this.candidateRepo.save(candidate);
      } catch (error) {
        this.logger.warn('Failed to delete expired need-generated character', {
          characterId: candidate.characterId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
