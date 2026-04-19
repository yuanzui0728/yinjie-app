import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('game_catalog_revisions')
export class GameCatalogRevisionEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  gameId: string;

  @Column('integer')
  revisionSequence: number;

  @Column('integer', { nullable: true })
  publishedVersion?: number | null;

  @Column('text', { nullable: true })
  summary?: string | null;

  @Column('text')
  changeSource: string;

  @Column('simple-json')
  snapshotPayload: {
    id: string;
    name: string;
    slogan: string;
    description: string;
    studio: string;
    heroLabel: string;
    category: string;
    tone: string;
    badge: string;
    deckLabel: string;
    estimatedDuration: string;
    rewardLabel: string;
    sessionObjective: string;
    publisherKind: string;
    productionKind: string;
    runtimeMode: string;
    reviewStatus: string;
    visibilityScope: string;
    sortOrder: number;
    sourceCharacterId?: string | null;
    sourceCharacterName?: string | null;
    aiHighlights: string[];
    tags: string[];
    updateNote: string;
    playersLabel: string;
    friendsLabel: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}
