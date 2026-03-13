import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CharacterEntity } from '../characters/character.entity';
import { FriendRequestEntity } from '../social/friend-request.entity';
import { MomentPostEntity } from '../moments/moment-post.entity';
import { FeedPostEntity } from '../feed/feed-post.entity';
import { WorldService } from '../world/world.service';
import { AiOrchestratorService } from '../ai/ai-orchestrator.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(CharacterEntity)
    private characterRepo: Repository<CharacterEntity>,
    @InjectRepository(FriendRequestEntity)
    private friendRequestRepo: Repository<FriendRequestEntity>,
    @InjectRepository(MomentPostEntity)
    private momentPostRepo: Repository<MomentPostEntity>,
    @InjectRepository(FeedPostEntity)
    private feedPostRepo: Repository<FeedPostEntity>,
    private readonly worldService: WorldService,
    private readonly ai: AiOrchestratorService,
  ) {}

  // Every 30 minutes: update WorldContext snapshot
  @Cron('*/30 * * * *')
  async updateWorldContext() {
    try {
      await this.worldService.snapshot();
      this.logger.debug('WorldContext snapshot updated');
    } catch (err) {
      this.logger.error('Failed to update WorldContext', err);
    }
  }

  // Every day at 23:59: expire pending friend requests
  @Cron('59 23 * * *')
  async expireFriendRequests() {
    try {
      const now = new Date();
      await this.friendRequestRepo.update(
        { status: 'pending', expiresAt: LessThan(now) },
        { status: 'expired' },
      );
      this.logger.debug('Expired old friend requests');
    } catch (err) {
      this.logger.error('Failed to expire friend requests', err);
    }
  }

  // Every 10 minutes: update AI online status based on activity schedule
  @Cron('*/10 * * * *')
  async updateAiActiveStatus() {
    try {
      const chars = await this.characterRepo.find();
      const hour = new Date().getHours();
      for (const char of chars) {
        const start = char.activeHoursStart ?? 8;
        const end = char.activeHoursEnd ?? 23;
        const shouldBeOnline = hour >= start && hour <= end;
        if (char.isOnline !== shouldBeOnline) {
          char.isOnline = shouldBeOnline;
          await this.characterRepo.save(char);
        }
      }
    } catch (err) {
      this.logger.error('Failed to update AI active status', err);
    }
  }

  // Every 15 minutes: check if any character should post a moment
  @Cron('*/15 * * * *')
  async checkMomentSchedule() {
    try {
      const chars = await this.characterRepo.find();
      const now = new Date();
      const hour = now.getHours();

      for (const char of chars) {
        if (!char.momentsFrequency || char.momentsFrequency < 1) continue;
        // Only post during active hours
        const start = char.activeHoursStart ?? 8;
        const end = char.activeHoursEnd ?? 22;
        if (hour < start || hour > end) continue;

        // Check if already posted today
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayCount = await this.momentPostRepo.count({
          where: { authorId: char.id, postedAt: LessThan(now) },
        });

        if (todayCount < char.momentsFrequency && Math.random() < 0.15) {
          await this.generateMomentForChar(char);
        }
      }
    } catch (err) {
      this.logger.error('Failed to check moment schedule', err);
    }
  }

  private async generateMomentForChar(char: CharacterEntity) {
    try {
      const text = await this.ai.generateMoment({
        profile: char.profile,
        currentTime: new Date(),
      });
      if (!text) return;

      const post = this.momentPostRepo.create({
        authorId: char.id,
        authorName: char.name,
        authorAvatar: char.avatar,
        authorType: 'character',
        text,
      });
      await this.momentPostRepo.save(post);
      this.logger.debug(`Auto-posted moment for ${char.name}`);
    } catch (err) {
      this.logger.error(`Failed to auto-post moment for ${char.name}`, err);
    }
  }
}
