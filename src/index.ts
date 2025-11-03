import Fastify from 'fastify';
import { Pool } from 'pg';
import { insertData, createBlockTable, blockValidation, computeBalances, rollbackToHeight } from './helper.ts';
import type { Block } from './interfaces.ts';

const fastify = Fastify({ logger: true });
let pool: Pool;
let blocks: Block[];

fastify.post('/blocks', async (req, rep) => {
  const body = req.body as { blocks: Block[] };
  blocks = body.blocks;
  return await blockValidation(pool, rep, blocks);
});

fastify.get('/balance/:address', async (req, rep) => {
  const {address} = req.params as {address: string};

  const computedBalance = computeBalances(address, blocks);
  return {balance: computedBalance};
});

fastify.post('/rollback/:height', async (req, rep) => {
    const { height } = req.params as {height: number};
    return rollbackToHeight(blocks, height);
});

async function bootstrap() {
  console.log('Bootstrapping...');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  pool = new Pool({
    connectionString: databaseUrl
  });

  await createBlockTable(pool);
  await insertData(pool);
}

try {
  await bootstrap();
  await fastify.listen({
    port: 3000,
    host: '0.0.0.0'
  })
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
};
