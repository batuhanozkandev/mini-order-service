import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from '../config';
import { Order } from '../entities/order.entity';
import { Payment } from '../entities/payment.entity';
import { Product } from '../entities/product.entity';
import { Init1794385148000 } from './migrations/1794385148000-Init';

export const dataSource = new DataSource({
  type: 'postgres',
  url: config.databaseUrl,
  entities: [Product, Order, Payment],
  // Explicit class list (not a glob) so it works both from dist/ and from src/ under Vitest.
  migrations: [Init1794385148000],
  synchronize: false,
  // Makes TypeORM use gen_random_uuid() (same as the migration) instead of its default uuid-ossp extension.
  uuidExtension: 'pgcrypto',
});
