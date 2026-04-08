import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { FeedPostEntity } from './feed-post.entity';
import { FeedCommentEntity } from './feed-comment.entity';
import { UserFeedInteractionEntity } from '../analytics/user-feed-interaction.entity';
import { AiModule } from '../ai/ai.module';
import { CharactersModule } from '../characters/characters.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeedPostEntity, FeedCommentEntity, UserFeedInteractionEntity]),
    AiModule,
    CharactersModule,
    AuthModule,
  ],
  providers: [FeedService],
  controllers: [FeedController],
  exports: [FeedService],
})
export class FeedModule {}
