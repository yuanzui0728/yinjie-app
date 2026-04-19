import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('need_discovery_runs')
export class NeedDiscoveryRunEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  cadenceType: string;

  @Column()
  status: string;

  @Column({ type: 'datetime' })
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  finishedAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  windowStartedAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  windowEndedAt?: Date | null;

  @Column({ default: 0 })
  signalCount: number;

  @Column({ type: 'datetime', nullable: true })
  latestSignalAt?: Date | null;

  @Column('text', { nullable: true })
  summary?: string | null;

  @Column('simple-json', { nullable: true })
  selectedNeedKeys?: string[] | null;

  @Column('text', { nullable: true })
  skipReason?: string | null;

  @Column('text', { nullable: true })
  errorMessage?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
