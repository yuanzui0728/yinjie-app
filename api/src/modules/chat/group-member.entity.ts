import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('group_members')
export class GroupMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  groupId: string;

  @Column()
  memberId: string;

  @Column({ default: 'character' })
  memberType: string; // 'user' | 'character'

  @Column({ nullable: true })
  memberName?: string;

  @Column({ nullable: true })
  memberAvatar?: string;

  @Column({ default: 'member' })
  role: string; // 'owner' | 'member'

  @CreateDateColumn()
  joinedAt: Date;
}
