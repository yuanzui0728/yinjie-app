import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('ai_relationships')
export class AIRelationshipEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  characterIdA: string;

  @Column()
  characterIdB: string;

  @Column({ default: 'acquaintance' })
  relationshipType: string; // 'acquaintance' | 'friend' | 'rival' | 'mentor' | 'romantic'

  @Column({ default: 50 })
  strength: number; // 0-100

  @Column({ nullable: true })
  backstory?: string;

  @CreateDateColumn()
  createdAt: Date;
}
