import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('need_discovery_candidates')
export class NeedDiscoveryCandidateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  runId?: string | null;

  @Column()
  cadenceType: string;

  @Column({ default: 'draft' })
  status: string;

  @Column()
  needKey: string;

  @Column()
  needCategory: string;

  @Column({ type: 'float', default: 0 })
  priorityScore: number;

  @Column({ type: 'float', default: 0 })
  confidenceScore: number;

  @Column('text', { nullable: true })
  coverageGapSummary?: string | null;

  @Column('simple-json', { nullable: true })
  evidenceHighlights?: string[] | null;

  @Column('simple-json', { nullable: true })
  requestedDomains?: string[] | null;

  @Column('text', { nullable: true })
  roleBrief?: string | null;

  @Column('simple-json', { nullable: true })
  generationContext?: Record<string, unknown> | null;

  @Column('text', { nullable: true })
  characterId?: string | null;

  @Column('text', { nullable: true })
  characterName?: string | null;

  @Column('text', { nullable: true })
  friendRequestId?: string | null;

  @Column('text', { nullable: true })
  friendRequestGreeting?: string | null;

  @Column({ type: 'datetime', nullable: true })
  expiresAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  acceptedAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  declinedAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  deletedAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  suppressedUntil?: Date | null;

  @Column('text', { nullable: true })
  errorMessage?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
