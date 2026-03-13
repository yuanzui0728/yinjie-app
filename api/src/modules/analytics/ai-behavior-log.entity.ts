import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('ai_behavior_logs')
export class AIBehaviorLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  characterId: string;

  @Column()
  behaviorType: string; // 'moment_post' | 'feed_post' | 'friend_request' | 'comment'

  @Column({ nullable: true })
  targetId?: string;

  @Column({ nullable: true })
  triggerReason?: string;

  @Column('simple-json', { nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
