import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('groups')
export class GroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column()
  creatorId: string;

  @Column({ default: 'user' })
  creatorType: string; // 'user' | 'character'

  @CreateDateColumn()
  createdAt: Date;
}
