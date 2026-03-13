import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorldContextEntity } from './world-context.entity';

@Injectable()
export class WorldService {
  constructor(
    @InjectRepository(WorldContextEntity)
    private repo: Repository<WorldContextEntity>,
  ) {}

  async snapshot(): Promise<WorldContextEntity> {
    const now = new Date();
    const hour = now.getHours();

    const timeOfDay =
      hour < 6 ? '深夜' :
      hour < 9 ? '早上' :
      hour < 12 ? '上午' :
      hour < 14 ? '中午' :
      hour < 18 ? '下午' :
      hour < 21 ? '傍晚' : '晚上';

    const month = now.getMonth() + 1;
    const season =
      month >= 3 && month <= 5 ? '春天' :
      month >= 6 && month <= 8 ? '夏天' :
      month >= 9 && month <= 11 ? '秋天' : '冬天';

    const ctx = this.repo.create({
      localTime: `${timeOfDay}${now.getHours()}点${now.getMinutes()}分`,
      season,
      holiday: this.getHoliday(now),
    });
    return this.repo.save(ctx);
  }

  async getLatest(): Promise<WorldContextEntity | null> {
    return this.repo.findOne({ order: { timestamp: 'DESC' } });
  }

  buildContextString(ctx: WorldContextEntity | null): string {
    if (!ctx) return '';
    const parts: string[] = [`当前时间：${ctx.localTime}`];
    if (ctx.season) parts.push(`季节：${ctx.season}`);
    if (ctx.weather) parts.push(`天气：${ctx.weather}`);
    if (ctx.location) parts.push(`位置：${ctx.location}`);
    if (ctx.holiday) parts.push(`节日：${ctx.holiday}`);
    return parts.join('，');
  }

  private getHoliday(date: Date): string | undefined {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    if (m === 1 && d === 1) return '元旦';
    if (m === 2 && d === 14) return '情人节';
    if (m === 5 && d === 1) return '劳动节';
    if (m === 6 && d === 1) return '儿童节';
    if (m === 10 && d === 1) return '国庆节';
    if (m === 12 && d === 25) return '圣诞节';
    return undefined;
  }
}
