import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { GroupService } from './group.service';

@Controller('conversations')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly groupService: GroupService,
  ) {}

  @Get()
  getConversations() {
    return this.chatService.getConversations();
  }

  @Post()
  getOrCreate(@Body() body: { characterId: string }) {
    return this.chatService.getOrCreateConversation(body.characterId);
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string) {
    return this.chatService.getMessages(id);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string) {
    return this.chatService.markConversationRead(id);
  }

  @Post(':id/pin')
  setPinned(
    @Param('id') id: string,
    @Body() body: { pinned: boolean },
  ) {
    return this.chatService.setConversationPinned(id, body.pinned);
  }

  @Post(':id/mute')
  setMuted(@Param('id') id: string, @Body() body: { muted: boolean }) {
    return this.chatService.setConversationMuted(id, body.muted);
  }

  @Post(':id/hide')
  hideConversation(@Param('id') id: string) {
    return this.chatService.hideConversation(id);
  }

  @Post(':id/clear')
  clearConversation(@Param('id') id: string) {
    return this.chatService.clearConversationHistory(id);
  }
}

@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  createGroup(@Body() body: {
    name: string;
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

  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.groupService.getMessages(id, Number(limit) || 100);
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

  @Post(':id/messages')
  async sendGroupMessage(
    @Param('id') id: string,
    @Body() body: { text: string },
  ) {
    const message = await this.groupService.sendOwnerMessage(id, body.text);
    this.groupService.triggerAiReplies(id, body.text, message.senderName);
    return message;
  }
}
