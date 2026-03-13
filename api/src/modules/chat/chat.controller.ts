import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { GroupService } from './group.service';

@Controller('conversations')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly groupService: GroupService,
  ) {}

  @Get()
  getConversations(@Query('userId') userId: string) {
    return this.chatService.getConversationsByUser(userId);
  }

  @Post()
  getOrCreate(@Body() body: { userId: string; characterId: string }) {
    return this.chatService.getOrCreateConversation(body.userId, body.characterId);
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string) {
    return this.chatService.getMessages(id);
  }
}

@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  createGroup(@Body() body: {
    name: string;
    creatorId: string;
    creatorType: 'user' | 'character';
    memberIds: string[];
  }) {
    return this.groupService.createGroup(body);
  }

  @Get(':id')
  getGroup(@Param('id') id: string) {
    return this.groupService.getGroup(id);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    return this.groupService.getMembers(id);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() body: {
      memberId: string;
      memberType: 'user' | 'character';
      memberName: string;
      memberAvatar?: string;
    },
  ) {
    return this.groupService.addMember(id, body);
  }

  @Get(':id/messages')
  getGroupMessages(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.groupService.getMessages(id, limit ? parseInt(limit) : 100);
  }
}
