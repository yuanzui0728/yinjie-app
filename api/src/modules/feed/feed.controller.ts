import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { FeedService } from './feed.service';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  getFeed(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.feedService.getFeed(Number(page), Number(limit));
  }

  @Get(':id')
  getPost(@Param('id') id: string) {
    return this.feedService.getPostWithComments(id);
  }

  @Post()
  createPost(@Body() body: { authorId: string; authorName: string; authorAvatar: string; text: string }) {
    return this.feedService.createPost(body.authorId, body.authorName, body.authorAvatar, body.text, 'user');
  }

  @Post(':id/comment')
  addComment(
    @Param('id') postId: string,
    @Body() body: { authorId: string; authorName: string; authorAvatar: string; text: string },
  ) {
    return this.feedService.addComment(postId, body.authorId, body.authorName, body.authorAvatar, body.text, 'user');
  }

  @Post(':id/like')
  likePost(@Param('id') postId: string, @Body() body: { userId: string }) {
    return this.feedService.likePost(postId, body.userId);
  }
}
