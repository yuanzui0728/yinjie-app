import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserFeedInteractionEntity } from '../analytics/user-feed-interaction.entity';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { CharacterEntity } from '../characters/character.entity';
import { CharactersModule } from '../characters/characters.module';
import { ConversationEntity } from '../chat/conversation.entity';
import { MessageEntity } from '../chat/message.entity';
import { SystemConfigModule } from '../config/config.module';
import { EventsModule } from '../events/events.module';
import { FeedCommentEntity } from '../feed/feed-comment.entity';
import { FeedPostEntity } from '../feed/feed-post.entity';
import { MomentCommentEntity } from '../moments/moment-comment.entity';
import { MomentPostEntity } from '../moments/moment-post.entity';
import { FriendshipEntity } from '../social/friendship.entity';
import { SocialModule } from '../social/social.module';
import { NeedDiscoveryCandidateEntity } from './need-discovery-candidate.entity';
import { NeedDiscoveryConfigService } from './need-discovery-config.service';
import { NeedDiscoveryLifecycleService } from './need-discovery-lifecycle.service';
import { NeedDiscoveryRunEntity } from './need-discovery-run.entity';
import { NeedDiscoveryService } from './need-discovery.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NeedDiscoveryRunEntity,
      NeedDiscoveryCandidateEntity,
      CharacterEntity,
      ConversationEntity,
      MessageEntity,
      MomentPostEntity,
      MomentCommentEntity,
      FeedPostEntity,
      FeedCommentEntity,
      UserFeedInteractionEntity,
      FriendshipEntity,
    ]),
    AiModule,
    AuthModule,
    CharactersModule,
    SystemConfigModule,
    SocialModule,
    EventsModule,
  ],
  providers: [
    NeedDiscoveryConfigService,
    NeedDiscoveryService,
    NeedDiscoveryLifecycleService,
  ],
  exports: [NeedDiscoveryConfigService, NeedDiscoveryService],
})
export class NeedDiscoveryModule {}
