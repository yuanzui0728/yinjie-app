import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { MomentsService } from './moments.service';

@Controller('moments')
export class MomentsController {
  constructor(private readonly momentsService: MomentsService) {}

  @Get()
  getFeed() {
    return this.momentsService.getFeed();
  }

  @Post('user-post')
  createUserMoment(@Body() body: { text: string }) {
    return this.momentsService.createUserMoment(body.text);
  }

  @Get(':id')
  getPost(@Param('id') id: string) {
    return this.momentsService.getPost(id);
  }

  @Post('generate/:characterId')
  generateForCharacter(@Param('characterId') characterId: string) {
    return this.momentsService.generateMomentForCharacter(characterId);
  }

  @Post('generate-all')
  generateAll() {
    return this.momentsService.generateAllMoments();
  }

  @Post(':id/comment')
  addComment(
    @Param('id') postId: string,
    @Body() body: { text: string },
  ) {
    return this.momentsService.addOwnerComment(postId, body.text);
  }

  @Post(':id/like')
  toggleLike(@Param('id') postId: string) {
    return this.momentsService.toggleOwnerLike(postId);
  }
}
