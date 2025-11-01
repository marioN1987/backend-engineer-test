import Fastify from 'fastify';
import type { Block, Transaction } from '../src/interfaces';
import crypto from 'crypto';

const fastifyServer = Fastify();
(fastifyServer as any).blockchain = [] as Block[];

// Helper: calculate block ID hash
const calculateBlockId = (height: number, transactions: Transaction[]): string => {
  const hashInput = height.toString() + transactions.map(tx => tx.id).join('');
  return crypto.createHash('sha256').update(hashInput).digest('hex');
};

// For testing, sumInputs just matches outputs (mock behavior)
const sumInputs = (tx: Transaction): number => tx.outputs.reduce((acc, out) => acc + out.value, 0);
const sumOutputs = (tx: Transaction): number => tx.outputs.reduce((acc, out) => acc + out.value, 0);

fastifyServer.post('/block', async (request, reply) => {
  const block: Block = request.body as Block;
  const blockchain: Block[] = (fastifyServer as any).blockchain;

  // 1. Validate height
  const expectedHeight = blockchain.length === 0 ? 1 : blockchain[blockchain.length - 1].height + 1;
  if (block.height !== expectedHeight) {
    return reply.status(400).send({ error: 'Invalid block height' });
  }

  // 2. Validate block ID hash first
  const correctHash = calculateBlockId(block.height, block.transactions);
  if (block.id !== correctHash) {
    return reply.status(400).send({ error: 'Invalid block id hash' });
  }

  // 3️. Validate transaction sums
  for (const tx of block.transactions) {
    const inputsSum = sumInputs(tx);
    const outputsSum = sumOutputs(tx);
    if (inputsSum !== outputsSum) {
      return reply.status(400).send({ error: 'Inputs sum != outputs sum' });
    }
  }

  blockchain.push(block);
  return reply.status(200).send({ message: 'Block added' });
});

export default fastifyServer;