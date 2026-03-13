import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupEntity } from './group.entity';
import { GroupMemberEntity } from './group-member.entity';
import { GroupMessageEntity } from './group-message.entity';

export interface CreateGroupDto {
  name: string;
  creatorId: string;
  creatorType: 'user' | 'character';
  memberIds: string[];
}

export interface AddMemberDto {
  memberId: string;
  memberType: 'user' | 'character';
  memberName: string;
  memberAvatar?: string;
}

@Injectable()
export class GroupService {
  private readonly logger = new Logger(GroupService.name);

  constructor(
    @InjectRepository(GroupEntity)
    private groupRepo: Repository<GroupEntity>,
    @InjectRepository(GroupMemberEntity)
    private memberRepo: Repository<GroupMemberEntity>,
    @InjectRepository(GroupMessageEntity)
    private messageRepo: Repository<GroupMessageEntity>,
  ) {}

  async createGroup(dto: CreateGroupDto): Promise<GroupEntity> {
    const group = this.groupRepo.create({
      name: dto.name,
      creatorId: dto.creatorId,
      creatorType: dto.creatorType,
    });
    await this.groupRepo.save(group);

    // Add creator as owner
    const ownerMember = this.memberRepo.create({
      groupId: group.id,
      memberId: dto.creatorId,
      memberType: dto.creatorType,
      role: 'owner',
    });
    await this.memberRepo.save(ownerMember);

    // Add other members
    for (const memberId of dto.memberIds) {
      const member = this.memberRepo.create({
        groupId: group.id,
        memberId,
        memberType: 'character',
        role: 'member',
      });
      await this.memberRepo.save(member);
    }

    this.logger.log(`Created group ${group.id} with ${dto.memberIds.length + 1} members`);
    return group;
  }

  async addMember(groupId: string, dto: AddMemberDto): Promise<GroupMemberEntity> {
    const existing = await this.memberRepo.findOne({
      where: { groupId, memberId: dto.memberId },
    });

    if (existing) {
      this.logger.warn(`Member ${dto.memberId} already in group ${groupId}`);
      return existing;
    }

    const member = this.memberRepo.create({
      groupId,
      memberId: dto.memberId,
      memberType: dto.memberType,
      memberName: dto.memberName,
      memberAvatar: dto.memberAvatar,
      role: 'member',
    });

    await this.memberRepo.save(member);
    this.logger.log(`Added member ${dto.memberId} to group ${groupId}`);
    return member;
  }

  async getGroup(groupId: string): Promise<GroupEntity | null> {
    return this.groupRepo.findOne({ where: { id: groupId } });
  }

  async getMembers(groupId: string): Promise<GroupMemberEntity[]> {
    return this.memberRepo.find({ where: { groupId }, order: { joinedAt: 'ASC' } });
  }

  async getMessages(groupId: string, limit = 100): Promise<GroupMessageEntity[]> {
    return this.messageRepo.find({
      where: { groupId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async sendMessage(
    groupId: string,
    senderId: string,
    senderType: 'user' | 'character',
    senderName: string,
    text: string,
    senderAvatar?: string,
  ): Promise<GroupMessageEntity> {
    const message = this.messageRepo.create({
      groupId,
      senderId,
      senderType,
      senderName,
      senderAvatar,
      text,
      type: 'text',
    });

    await this.messageRepo.save(message);
    return message;
  }

  async sendSystemMessage(groupId: string, text: string): Promise<GroupMessageEntity> {
    const message = this.messageRepo.create({
      groupId,
      senderId: 'system',
      senderType: 'character',
      senderName: 'system',
      text,
      type: 'system',
    });

    await this.messageRepo.save(message);
    return message;
  }
}
