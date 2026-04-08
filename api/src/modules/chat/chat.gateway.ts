import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

interface SendMessagePayload {
  conversationId: string;
  characterId: string;
  text: string;
}

const configuredSocketOrigins = process.env.CORS_ALLOWED_ORIGINS
  ?.split(',')
  .map((value) => value.trim())
  .filter(Boolean);

@WebSocketGateway({
  cors: {
    origin:
      !configuredSocketOrigins?.length || configuredSocketOrigins.includes('*')
        ? true
        : configuredSocketOrigins,
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_conversation')
  handleJoin(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.conversationId);
    return { event: 'joined', data: data.conversationId };
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() payload: SendMessagePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { conversationId, characterId, text } = payload;

    try {
      let convId = conversationId;
      const existing = await this.chatService.getConversation(convId);
      if (!existing) {
        const conv = await this.chatService.getOrCreateConversation(characterId, conversationId);
        convId = conv.id;
      }

      const activity = await this.chatService.getCharacterActivity(characterId);

      if (activity === 'sleeping') {
        const sleepReplies = [
          '锛堟秷鎭凡閫佽揪锛屽鏂规鍦ㄧ潯瑙?馃挙锛?,
          '锛堟繁澶滀簡锛屽鏂瑰凡鍏ョ潯锛屾槑澶╁啀鑱婂惂锛?,
          '锛堝鏂圭潯鐫€浜嗭紝娑堟伅鏄庡ぉ鎵嶈兘鐪嬪埌锛?,
        ];
        this.server.to(convId).emit('new_message', {
          id: `msg_${Date.now()}_sys`,
          conversationId: convId,
          senderType: 'system', senderId: 'system', senderName: 'system',
          type: 'system',
          text: sleepReplies[Math.floor(Math.random() * sleepReplies.length)],
          createdAt: new Date(),
        });
        return { event: 'message_sent', data: { conversationId: convId } };
      }

      const busyActivities = ['working', 'commuting'];
      if (busyActivities.includes(activity ?? '')) {
        const busyHints: Record<string, string[]> = {
          working: ['锛堝鏂规鍦ㄤ笂鐝紝绋嶅悗鍥炲锛?, '锛堝伐浣滀腑锛屾秷鎭凡璇伙紝绛変細鍎垮洖锛?, '锛堝繖鐫€鍛紝涓€浼氬効鍥炰綘锛?],
          commuting: ['锛堝鏂瑰湪璺笂锛岀◢鍚庡洖澶嶏級', '锛堥€氬嫟涓紝娑堟伅宸茶锛?, '锛堝湪鍦伴搧涓婏紝淇″彿涓嶅ソ锛岀瓑浼氬児鍥烇級'],
        };
        const hints = busyHints[activity!] ?? ['锛堝鏂规蹇欙紝绋嶅悗鍥炲锛?];
        this.server.to(convId).emit('new_message', {
          id: `msg_${Date.now()}_sys`,
          conversationId: convId,
          senderType: 'system', senderId: 'system', senderName: 'system',
          type: 'system',
          text: hints[Math.floor(Math.random() * hints.length)],
          createdAt: new Date(),
        });

        const delay = 8000 + Math.random() * 7000;
        setTimeout(async () => {
          try {
            this.server.to(convId).emit('typing_start', { characterId });
            const messages = await this.chatService.sendMessage(convId, text);
            const aiReply = messages.find((m) => m.senderType === 'character');
            if (aiReply) {
              const typingDelay = Math.min(Math.max(aiReply.text.length * 16, 400), 3000);
              await new Promise((r) => setTimeout(r, typingDelay));
            }
            this.server.to(convId).emit('typing_stop', { characterId });
            for (const msg of messages) {
              this.server.to(convId).emit('new_message', msg);
            }
          } catch {
            this.server.to(convId).emit('typing_stop', { characterId });
          }
        }, delay);

        return { event: 'message_sent', data: { conversationId: convId } };
      }

      this.server.to(convId).emit('typing_start', { characterId });

      const messages = await this.chatService.sendMessage(convId, text);

      const aiReply = messages.find((m) => m.senderType === 'character');
      if (aiReply) {
        const charCount = aiReply.text.length;
        const delay = Math.min(Math.max(charCount * 16, 400), 3000);
        await new Promise((r) => setTimeout(r, delay));
      }

      this.server.to(convId).emit('typing_stop', { characterId });

      for (const msg of messages) {
        this.server.to(convId).emit('new_message', msg);
      }

      const conv = await this.chatService.getConversation(convId);
      if (conv?.type === 'group') {
        this.server.to(convId).emit('conversation_updated', {
          id: convId,
          type: conv.type,
          title: conv.title,
          participants: conv.participants,
        });
      }

      return { event: 'message_sent', data: { conversationId: convId } };
    } catch (err) {
      this.logger.error('Error handling message', err);
      client.emit('error', { message: '娑堟伅鍙戦€佸け璐ワ紝璇烽噸璇? });
    }
  }

  async sendProactiveMessage(convId: string, characterId: string, characterName: string, text: string) {
    const message = await this.chatService.saveProactiveMessage(
      convId,
      characterId,
      characterName,
      text,
    );
    this.server.to(convId).emit('new_message', message);
    return message;
  }
}
