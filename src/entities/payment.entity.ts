import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from './product.entity';

export type PaymentStatus = 'CREATED';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  amount!: number;

  @Column({ type: 'text', default: 'CREATED' })
  status!: PaymentStatus;
}
