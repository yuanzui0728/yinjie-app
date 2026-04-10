import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('official_account_follows')
@Unique(['ownerId', 'accountId'])
export class OfficialAccountFollowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ownerId: string;

  @Column()
  accountId: string;

  @Column({ default: false })
  isMuted: boolean;

  @Column({ type: 'datetime', nullable: true })
  mutedAt?: Date | null;

  @CreateDateColumn()
  followedAt: Date;
}
