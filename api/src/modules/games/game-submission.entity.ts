import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('game_submissions')
export class GameSubmissionEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  sourceKind: string;

  @Column('text')
  status: string;

  @Column('text')
  proposedGameId: string;

  @Column('text')
  proposedName: string;

  @Column('text')
  slogan: string;

  @Column('text')
  description: string;

  @Column('text')
  studio: string;

  @Column('text')
  category: string;

  @Column('text')
  tone: string;

  @Column('text')
  runtimeMode: string;

  @Column('text')
  productionKind: string;

  @Column('text', { nullable: true })
  sourceCharacterId?: string | null;

  @Column('text', { nullable: true })
  sourceCharacterName?: string | null;

  @Column('text')
  submitterName: string;

  @Column('text')
  submitterContact: string;

  @Column('text')
  submissionNote: string;

  @Column('text', { nullable: true })
  reviewNote?: string | null;

  @Column('text', { nullable: true })
  linkedCatalogGameId?: string | null;

  @Column('simple-json')
  aiHighlightsPayload: string[];

  @Column('simple-json')
  tagsPayload: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
