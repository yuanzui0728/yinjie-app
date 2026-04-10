import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('official_account_articles')
export class OfficialAccountArticleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  accountId: string;

  @Column()
  title: string;

  @Column({ type: 'text', default: '' })
  summary: string;

  @Column({ nullable: true, type: 'text' })
  coverImage?: string | null;

  @Column({ default: '' })
  authorName: string;

  @Column({ type: 'text' })
  contentHtml: string;

  @Column({ type: 'datetime' })
  publishedAt: Date;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: 0 })
  readCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
