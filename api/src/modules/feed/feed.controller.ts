import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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
  createPost(@Body() body: { text: string }) {
    return this.feedService.createOwnerPost(body.text);
  }

  @Post(':id/comment')
  addComment(
    @Param('id') postId: string,
    @Body() body: { text: string },
  ) {
    return this.feedService.addOwnerComment(postId, body.text);
  }

  @Post(':id/like')
  likePost(@Param('id') postId: string) {
    return this.feedService.likeOwnerPost(postId);
  }
}
