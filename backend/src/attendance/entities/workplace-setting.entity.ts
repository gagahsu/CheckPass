import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('workplace_settings')
export class WorkplaceSetting {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'store_id', type: 'bigint', nullable: true })
  storeId: number | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ name: 'gps_radius_meters', type: 'int', default: 200 })
  gpsRadiusMeters: number;

  /** Comma-separated list of allowed WiFi SSIDs */
  @Column({ name: 'wifi_ssids', type: 'text', nullable: true })
  wifiSsids: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  getAllowedSsids(): string[] {
    if (!this.wifiSsids) return [];
    return this.wifiSsids.split(',').map((s) => s.trim()).filter(Boolean);
  }
}
