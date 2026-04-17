import {
  CreateDateColumn,
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  ActionConnectorOperationValue,
  ActionConnectorProviderTypeValue,
  ActionConnectorStatusValue,
} from './action-runtime.types';

@Entity('action_connectors')
export class ActionConnectorEntity {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  connectorKey: string;

  @Column()
  displayName: string;

  @Column()
  providerType: ActionConnectorProviderTypeValue;

  @Column({ default: 'ready' })
  status: ActionConnectorStatusValue;

  @Column('simple-json', { nullable: true })
  endpointConfigPayload?: Record<string, unknown> | null;

  @Column('text', { nullable: true })
  credentialPayloadEncrypted?: string | null;

  @Column('simple-json')
  capabilitiesPayload: ActionConnectorOperationValue[];

  @Column({ type: 'datetime', nullable: true })
  lastHealthCheckAt?: Date | null;

  @Column('text', { nullable: true })
  lastError?: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
