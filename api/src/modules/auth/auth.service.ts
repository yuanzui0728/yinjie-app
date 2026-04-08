import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './user.entity';
import type { AiKeyOverride } from '../ai/ai.types';
import { decryptUserApiKey, encryptUserApiKey } from './api-key-crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  private buildSessionPayload(user: UserEntity) {
    return {
      token: this.jwtService.sign({ sub: user.id, username: user.username }),
      userId: user.id,
      username: user.username,
      onboardingCompleted: user.onboardingCompleted,
      avatar: user.avatar,
      signature: user.signature,
      hasCustomApiKey: Boolean(user.customApiKey),
      customApiBase: user.customApiBase ?? null,
    };
  }

  private parseAuthorizationHeader(header?: string | null) {
    if (!header) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    return token;
  }

  async requireUserFromAuthorization(header?: string | null) {
    const token = this.parseAuthorizationHeader(header);
    const payload = this.jwtService.verify<{ sub?: string }>(token);
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid session token');
    }

    const user = await this.userRepo.findOneBy({ id: payload.sub });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async ensureAuthorizedUser(targetUserId: string, header?: string | null) {
    const user = await this.requireUserFromAuthorization(header);
    if (user.id !== targetUserId) {
      throw new ForbiddenException('Cannot access another user');
    }

    return user;
  }

  async register(username: string, password: string) {
    const existing = await this.userRepo.findOneBy({ username });
    if (existing) throw new ConflictException('用户名已存在');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ username, passwordHash, onboardingCompleted: true });
    await this.userRepo.save(user);

    return this.buildSessionPayload(user);
  }

  async login(username: string, password: string) {
    const user = await this.userRepo.findOneBy({ username });
    if (!user) throw new UnauthorizedException('用户名或密码错误');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('用户名或密码错误');

    return this.buildSessionPayload(user);
  }

  // Onboarding: create user with just a name (no password required)
  async initUser(username: string) {
    let user = await this.userRepo.findOneBy({ username });
    if (user) {
      return this.buildSessionPayload(user);
    }

    const passwordHash = await bcrypt.hash(`onboarding_${Date.now()}`, 10);
    user = this.userRepo.create({ username, passwordHash, onboardingCompleted: false });
    await this.userRepo.save(user);

    return this.buildSessionPayload(user);
  }

  async getCurrentUser(authorization?: string | null) {
    const user = await this.requireUserFromAuthorization(authorization);
    return {
      id: user.id,
      username: user.username,
      onboardingCompleted: user.onboardingCompleted,
      avatar: user.avatar,
      signature: user.signature,
      hasCustomApiKey: Boolean(user.customApiKey),
      customApiBase: user.customApiBase ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async completeOnboarding(userId: string) {
    await this.userRepo.update(userId, { onboardingCompleted: true });
    return { success: true };
  }

  async updateUser(userId: string, data: { username?: string; avatar?: string; signature?: string }) {
    await this.userRepo.update(userId, data);
    return { success: true };
  }

  async deleteUser(userId: string) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepo.delete(userId);
    return { success: true };
  }

  async setUserApiKey(userId: string, apiKey: string, apiBase?: string) {
    await this.userRepo.update(userId, {
      customApiKey: encryptUserApiKey(apiKey.trim()),
      customApiBase: apiBase?.trim() ? apiBase.trim() : null,
    });
    return { success: true };
  }

  async clearUserApiKey(userId: string) {
    await this.userRepo.update(userId, { customApiKey: null, customApiBase: null });
    return { success: true };
  }

  async getUserAiConfig(userId: string): Promise<AiKeyOverride | null> {
    const user = await this.userRepo.findOneBy({ id: userId });
    const decryptedApiKey = decryptUserApiKey(user?.customApiKey);
    if (!decryptedApiKey?.trim()) return null;
    return { apiKey: decryptedApiKey, apiBase: user?.customApiBase ?? undefined };
  }

  async listSessions(authorization?: string | null) {
    const user = await this.requireUserFromAuthorization(authorization);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return [
      {
        sessionId: user.id,
        tokenLabel: `${user.username}-current`,
        createdAt: user.createdAt.toISOString(),
        lastSeenAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        current: true,
      },
    ];
  }

  async revokeSession() {
    return { success: true };
  }

  async logout() {
    return { success: true };
  }

  async logoutAll() {
    return { success: true };
  }
}
