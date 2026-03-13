import { Module } from '@nestjs/common';
import { EventBusService } from './event-bus.service';

@Module({
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventsModule {}
