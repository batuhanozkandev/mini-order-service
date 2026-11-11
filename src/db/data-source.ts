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
  // The migration owns the schema (ids default to the built-in gen_random_uuid()), so TypeORM must not create extensions on boot.
  installExtensions: false,
});
