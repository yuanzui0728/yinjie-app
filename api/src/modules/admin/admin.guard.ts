import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('ADMIN_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Admin access is not configured on this server.');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-admin-secret'];

    if (provided !== secret) {
      throw new UnauthorizedException('Invalid admin secret.');
    }

    return true;
  }
}
