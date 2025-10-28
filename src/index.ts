import Fastify from 'fastify';
import { Pool } from 'pg';
import { randomUUID, type UUID } from 'crypto';

const fastify = Fastify({ logger: true });

interface Output {
  id: UUID;
  address: string;
  value: number;
}

interface Input {
  id: UUID;
  txId: string;
  index: number;
}

interface Transaction {
  id: string;
  inputId: UUID;
  outputId: UUID;
}

interface Block {
  id: string;
  height: number;
  transactions: Array<Transaction>;
}


fastify.get('/', async (request, reply) => {
  return { hello: 'world' };
});

fastify.post('/balance/address', async (request, reply) => {
  return { hello: 'world' };
});

fastify.post('/rollback?height=number', async (request, reply) => {
  return { hello: 'world' };
});

async function testPostgres(pool: Pool) {
  const inputsId = randomUUID();
  const outputsId = randomUUID();
  // const name = 'Satoshi2';
  // const email = 'Nakamoto1';

  const outEx: Output[] = [{
    id: outputsId,
    address: 'addr1',
    value: 20
  }];

  const inEx: Input[] = [{
    id: inputsId,
    txId: 'tx1',
    index: 0
  }];

  const transactionEx : Transaction = {
    id: "tx1",
    inputId: inputsId,
    outputId: outputsId
  }
  // await pool.query(`DELETE FROM users;`);

  //   await pool.query(`
  //   INSERT INTO users (id, name, email)
  //   VALUES ($1, $2, $3);
  // `, [id, name, email]);

  await pool.query(`
    INSERT INTO outputs(id, address, value) 
    VALUES ($1, $2, $3)`, [outEx[0].id, outEx[0].address, outEx[0].value]);

  await pool.query(`
    INSERT INTO inputs(id, txId, index) 
    VALUES ($1, $2, $3)`, [inEx[0].id, inEx[0].txId, inEx[0].index]);

  await pool.query(`
    INSERT INTO transactions(id, inputId, outputId) 
    VALUES ($1, $2, $3)`, [transactionEx.id, transactionEx.inputId, transactionEx.outputId]);
}

async function createTables(pool: Pool) {
  // await pool.query(`
  //   CREATE TABLE IF NOT EXISTS users (
  //     id TEXT PRIMARY KEY,
  //     name TEXT NOT NULL,
  //     email TEXT NOT NULL
  //   );
  // `);

  await createInputTable(pool);
  await createOutputTable(pool);
  await createTransactionTable(pool);
}

async function createOutputTable(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS outputs (
      id TEXT PRIMARY KEY,
      address TEXT,
      value INTEGER
    );
  `);
}

async function createInputTable(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inputs (
      id TEXT PRIMARY KEY,
      txId TEXT,
      index INTEGER
    );
  `);
}

async function createTransactionTable(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      inputId TEXT REFERENCES inputs(id),
      outputId TEXT REFERENCES outputs(id)
    );
  `);
}

async function bootstrap() {
  console.log('Bootstrapping...');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({
    connectionString: databaseUrl
  });

  await createTables(pool);
  await testPostgres(pool);
}

try {
  await bootstrap();
  await fastify.listen({
    port: 3000,
    host: '0.0.0.0'
  })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
};