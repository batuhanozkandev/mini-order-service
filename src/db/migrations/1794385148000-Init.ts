import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1794385148000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // gen_random_uuid() is built into Postgres 13+, so no extension is needed.
    // CHECK (stock >= 0) is the last line of defense: even if two orders race,
    // the database refuses to let stock go negative.
    await queryRunner.query(`
      CREATE TABLE products (
        id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        name       text          NOT NULL,
        price      numeric(10,2) NOT NULL,
        stock      integer       NOT NULL CHECK (stock >= 0),
        updated_at timestamptz   NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE orders (
        id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id uuid        NOT NULL REFERENCES products (id),
        quantity   integer     NOT NULL,
        status     text        NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED')),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE payments (
        id       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id uuid          NOT NULL REFERENCES orders (id),
        amount   numeric(12,2) NOT NULL,
        status   text          NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED'))
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order of creation, because of the foreign keys.
    await queryRunner.query(`DROP TABLE payments`);
    await queryRunner.query(`DROP TABLE orders`);
    await queryRunner.query(`DROP TABLE products`);
  }
}
