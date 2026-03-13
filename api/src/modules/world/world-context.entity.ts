import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('world_contexts')
export class WorldContextEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  localTime: string; // "下午三点"

  @Column({ nullable: true })
  weather?: string; // "北京今天下雪"

  @Column({ nullable: true })
  location?: string; // "上海"

  @Column({ nullable: true })
  season?: string;

  @Column({ nullable: true })
  holiday?: string; // "除夕"

  @Column('simple-json', { nullable: true })
  recentEvents?: string[];

  @CreateDateColumn()
  timestamp: Date;
}
