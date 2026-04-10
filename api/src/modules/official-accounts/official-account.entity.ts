import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('official_accounts')
export class OfficialAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  handle: string;

  @Column({ default: '' })
  avatar: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ default: 'subscription' })
  accountType: string;

  @Column({ nullable: true, type: 'text' })
  coverImage?: string | null;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true, type: 'text' })
  menuPayload?: string | null;

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastPublishedAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
