import {
  CreateDateColumn,
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  ActionPlanValue,
  ActionRiskLevelValue,
  ActionRunStatusValue,
} from './action-runtime.types';

@Entity('action_runs')
export class ActionRunEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  conversationId: string;

  @Column()
  ownerId: string;

  @Column()
  characterId: string;

  @Column()
  connectorKey: string;

  @Column()
  operationKey: string;

  @Column()
  title: string;

  @Column()
  status: ActionRunStatusValue;

  @Column()
  riskLevel: ActionRiskLevelValue;

  @Column({ default: false })
  requiresConfirmation: boolean;

  @Column('text')
  userGoal: string;

  @Column('simple-json')
  slotPayload: Record<string, unknown>;

  @Column('simple-json')
  missingSlots: string[];

  @Column('simple-json', { nullable: true })
  planPayload?: ActionPlanValue | null;

  @Column('simple-json', { nullable: true })
  policyDecisionPayload?: Record<string, unknown> | null;

  @Column('simple-json', { nullable: true })
  confirmationPayload?: Record<string, unknown> | null;

  @Column('simple-json', { nullable: true })
  executionPayload?: Record<string, unknown> | null;

  @Column('simple-json', { nullable: true })
  resultPayload?: Record<string, unknown> | null;

  @Column('simple-json', { nullable: true })
  errorPayload?: Record<string, unknown> | null;

  @Column('simple-json', { nullable: true })
  tracePayload?: Record<string, unknown> | null;

  @Column('text', { nullable: true })
  resultSummary?: string | null;

  @Column('text', { nullable: true })
  errorMessage?: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
