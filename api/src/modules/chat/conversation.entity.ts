import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('conversations')
export class ConversationEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  userId: string;

  @Column({ default: 'direct' })
  type: string;

  @Column()
  title: string;

  @Column('simple-json')
  participants: string[];

  @Column({ nullable: true })
  lastReadAt?: Date | null;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ nullable: true })
  pinnedAt?: Date | null;

  @Column({ default: false })
  isHidden: boolean;

  @Column({ nullable: true })
  hiddenAt?: Date | null;

  @Column({ nullable: true })
  lastClearedAt?: Date | null;

  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastActivityAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
