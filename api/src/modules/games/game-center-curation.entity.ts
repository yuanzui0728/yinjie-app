import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('game_center_curations')
export class GameCenterCurationEntity {
  @PrimaryColumn('text')
  id: string;

  @Column('simple-json')
  featuredGameIdsPayload: string[];

  @Column('simple-json')
  shelvesPayload: Array<{
    id: string;
    title: string;
    description: string;
    gameIds: string[];
  }>;

  @Column('simple-json')
  hotRankingsPayload: Array<{
    gameId: string;
    rank: number;
    note: string;
  }>;

  @Column('simple-json')
  newRankingsPayload: Array<{
    gameId: string;
    rank: number;
    note: string;
  }>;

  @Column('simple-json')
  eventsPayload: Array<{
    id: string;
    title: string;
    description: string;
    meta: string;
    ctaLabel: string;
    relatedGameId: string;
    actionKind: 'mission' | 'reminder' | 'join';
    tone: 'forest' | 'gold' | 'ocean' | 'violet' | 'sunset' | 'mint';
  }>;

  @Column('simple-json')
  storiesPayload: Array<{
    id: string;
    title: string;
    description: string;
    eyebrow: string;
    authorName: string;
    ctaLabel: string;
    publishedAt: string;
    kind: 'spotlight' | 'guide' | 'update' | 'behind_the_scenes';
    tone: 'forest' | 'gold' | 'ocean' | 'violet' | 'sunset' | 'mint';
    relatedGameId?: string | null;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
