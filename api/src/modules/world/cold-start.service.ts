import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../auth/user.entity';
import { FriendRequestEntity } from '../social/friend-request.entity';
import { CharacterEntity } from '../characters/character.entity';

/**
 * 冷启动逻辑：
 * - 第 1 天：世界安静，无主动触发
 * - 第 1 周（2-7天）：每天 1-2 个场景触发
 * - 第 1 月后（>30天）：正常频率
 */
@Injectable()
export class ColdStartService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ColdStartService.name);

  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
    @InjectRepository(FriendRequestEntity)
    private friendRequestRepo: Repository<FriendRequestEntity>,
    @InjectRepository(CharacterEntity)
    private characterRepo: Repository<CharacterEntity>,
  ) {}

  async onApplicationBootstrap() {
    // Run cold start check shortly after boot
    setTimeout(() => this.runColdStartCheck(), 5000);
  }

  /**
   * Returns the activity multiplier based on how long the user has been registered.
   * 0 = silent, 0.3 = low, 1.0 = normal
   */
  async getActivityMultiplier(userId: string): Promise<number> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return 0;

    const daysSinceJoin = this.getDaysSince(user.createdAt);

    if (daysSinceJoin < 1) return 0;       // Day 1: silent
    if (daysSinceJoin < 7) return 0.3;     // Week 1: low activity
    if (daysSinceJoin < 30) return 0.7;    // Month 1: moderate
    return 1.0;                             // After 1 month: full
  }

  /**
   * Determines how many scene triggers are allowed today for a user.
   */
  async getDailyTriggerLimit(userId: string): Promise<number> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return 0;

    const daysSinceJoin = this.getDaysSince(user.createdAt);

    if (daysSinceJoin < 1) return 0;
    if (daysSinceJoin < 7) return Math.floor(Math.random() * 2) + 1; // 1-2 per day
    if (daysSinceJoin < 30) return 3;
    return 5;
  }

  /**
   * On boot, trigger initial friend requests for brand-new users (day 1-3).
   */
  private async runColdStartCheck() {
    try {
      const users = await this.userRepo.find();
      for (const user of users) {
        const daysSinceJoin = this.getDaysSince(user.createdAt);
        if (daysSinceJoin >= 3) continue; // Only for new users

        const existingRequests = await this.friendRequestRepo.count({
          where: { userId: user.id },
        });

        // If user has no friend requests yet, seed 1-2 initial ones
        if (existingRequests === 0) {
          await this.seedInitialFriendRequests(user.id, daysSinceJoin);
        }
      }
    } catch (err) {
      this.logger.error('Cold start check failed', err);
    }
  }

  private async seedInitialFriendRequests(userId: string, daysSinceJoin: number) {
    if (daysSinceJoin < 1) return; // Day 0: completely silent

    // Pick 1-2 template characters to send initial requests
    const templateChars = await this.characterRepo.find({
      where: { isTemplate: true },
      take: daysSinceJoin < 2 ? 1 : 2,
    });

    for (const char of templateChars) {
      const expiresAt = new Date();
      expiresAt.setHours(23, 59, 59, 999);

      const req = this.friendRequestRepo.create({
        userId,
        characterId: char.id,
        characterName: char.name,
        characterAvatar: char.avatar ?? '👤',
        greeting: this.getInitialMessage(char),
        status: 'pending',
        expiresAt,
      });

      await this.friendRequestRepo.save(req);
      this.logger.log(`Cold start: seeded friend request from ${char.name} to user ${userId}`);
    }
  }

  private getInitialMessage(char: CharacterEntity): string {
    const messages: Record<string, string> = {
      char_roommate: '哥们！你也来这里了？加个好友呗，以后有事好联系',
      char_doctor: '你好，我是李晓梅，刚好在这里遇到你，加个好友吧',
      char_lawyer: '你好，我是王建国，认识一下？',
      char_tech: '嗨，加个好友',
      char_designer: '你好呀～我是苏苏，感觉我们会聊得来的',
    };
    return messages[char.id] ?? `你好，我是${char.name}，认识一下？`;
  }

  private getDaysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return diff / (1000 * 60 * 60 * 24);
  }
}
