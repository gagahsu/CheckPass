import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'checkpass',
  username: process.env.DATABASE_USER || 'checkpass',
  password: process.env.DATABASE_PASSWORD || 'checkpass',
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  entities: [path.resolve(__dirname, '../**/*.entity.ts')],
  migrations: [path.resolve(__dirname, './migrations/*.ts')],
  migrationsTableName: 'typeorm_migrations',
});

export default AppDataSource;
