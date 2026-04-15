import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("cloud_instances")
export class CloudInstanceEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index({ unique: true })
  @Column()
  worldId: string;

  @Column({ default: "mock" })
  providerKey: string;

  @Index({ unique: true })
  @Column({ type: "text", nullable: true })
  providerInstanceId: string | null;

  @Column()
  name: string;

  @Column({ type: "text", nullable: true })
  region: string | null;

  @Column({ type: "text", nullable: true })
  zone: string | null;

  @Column({ type: "text", nullable: true })
  privateIp: string | null;

  @Column({ type: "text", nullable: true })
  publicIp: string | null;

  @Column({ default: "absent" })
  powerState: string;

  @Column({ type: "text", nullable: true })
  imageId: string | null;

  @Column({ type: "text", nullable: true })
  flavor: string | null;

  @Column({ default: 20 })
  diskSizeGb: number;

  @Column({ type: "datetime", nullable: true })
  bootstrappedAt: Date | null;

  @Column({ type: "datetime", nullable: true })
  lastHeartbeatAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
