import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export const AppEvents = {
  USER_SENT_MESSAGE: 'user.sent_message',
  USER_POSTED_MOMENT: 'user.posted_moment',
  USER_POSTED_FEED: 'user.posted_feed',
  USER_LOCATION_UPDATED: 'user.location_updated',
  AI_RELATIONSHIP_TRIGGERED: 'ai.relationship_triggered',
} as const;

@Injectable()
export class EventBusService {
  constructor(private readonly emitter: EventEmitter2) {}

  emit(event: string, payload: unknown) {
    this.emitter.emit(event, payload);
  }

  on(event: string, listener: (...args: unknown[]) => void) {
    this.emitter.on(event, listener);
  }
}
