import { Controller, Get, Param, Post } from '@nestjs/common';
import { OfficialAccountsService } from './official-accounts.service';

@Controller('official-accounts')
export class OfficialAccountsController {
  constructor(
    private readonly officialAccountsService: OfficialAccountsService,
  ) {}

  @Get()
  listAccounts() {
    return this.officialAccountsService.listAccounts();
  }

  @Get('articles/:articleId')
  getArticle(@Param('articleId') articleId: string) {
    return this.officialAccountsService.getArticle(articleId);
  }

  @Post('articles/:articleId/read')
  markArticleRead(@Param('articleId') articleId: string) {
    return this.officialAccountsService.markArticleRead(articleId);
  }

  @Get(':id/articles')
  listAccountArticles(@Param('id') id: string) {
    return this.officialAccountsService.listAccountArticles(id);
  }

  @Get(':id')
  getAccount(@Param('id') id: string) {
    return this.officialAccountsService.getAccount(id);
  }

  @Post(':id/follow')
  follow(@Param('id') id: string) {
    return this.officialAccountsService.followAccount(id);
  }

  @Post(':id/unfollow')
  unfollow(@Param('id') id: string) {
    return this.officialAccountsService.unfollowAccount(id);
  }
}
