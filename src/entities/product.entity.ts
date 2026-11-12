import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn, ValueTransformer } from 'typeorm';

// pg returns NUMERIC as a string (to keep exact precision); the API works with JS numbers.
export const numericTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericTransformer })
  price!: number;

  @Column({ type: 'integer' })
  stock!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
