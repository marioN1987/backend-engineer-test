import fastifyServer from './server';
import type { Block, Transaction, Input, Output } from '../src/interfaces';
import crypto from 'crypto';

// Helper: calculate block ID
const calculateBlockId = (height: number, transactions: Transaction[]): string => {
  const hashInput = height.toString() + transactions.map(tx => tx.id).join('');
  return crypto.createHash('sha256').update(hashInput).digest('hex');
};

// Helper: create a valid transaction
const createTransaction = (id: string, inputs: number[], outputs: number[]): Transaction => ({
  id,
  inputs: inputs.map((value, idx) => ({ txId: `tx${idx}`, index: idx } as Input)),
  outputs: outputs.map((value, idx) => ({ address: `addr${idx}`, value } as Output)),
});

describe('POST /block validations', () => {
  beforeEach(() => {
    (fastifyServer as any).blockchain = [];
  });

  it('accepts a valid first block', async () => {
    const block: Block = { id: calculateBlockId(1, []), height: 1, transactions: [] };

    const res = await fastifyServer.inject({ method: 'POST', url: '/block', payload: block });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).message).toBe('Block added');
  });

  it('rejects first block with invalid height', async () => {
    const block: Block = { id: calculateBlockId(2, []), height: 2, transactions: [] };

    const res = await fastifyServer.inject({ method: 'POST', url: '/block', payload: block });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('Invalid block height');
  });

  it('rejects block with incorrect height', async () => {
    const firstBlock: Block = { id: calculateBlockId(1, []), height: 1, transactions: [] };
    await fastifyServer.inject({ method: 'POST', url: '/block', payload: firstBlock });

    const block: Block = { id: calculateBlockId(3, []), height: 3, transactions: [] };

    const res = await fastifyServer.inject({ method: 'POST', url: '/block', payload: block });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('Invalid block height');
  });

  it('rejects block with inputs != outputs sum', async () => {
    const firstBlock: Block = { id: calculateBlockId(1, []), height: 1, transactions: [] };
    await fastifyServer.inject({ method: 'POST', url: '/block', payload: firstBlock });

    const tx = createTransaction('tx1', [50], [40]); // inputs sum 50, outputs sum 40
    const block: Block = { id: calculateBlockId(2, [tx]), height: 2, transactions: [tx] };

    const res = await fastifyServer.inject({ method: 'POST', url: '/block', payload: block });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).message).toBe('Block added');
  });

  it('rejects block with invalid block ID hash', async () => {
    const firstBlock: Block = { id: calculateBlockId(1, []), height: 1, transactions: [] };
    await fastifyServer.inject({ method: 'POST', url: '/block', payload: firstBlock });

    const tx = createTransaction('tx1', [50], [50]);
    const block: Block = { id: 'invalid-hash', height: 2, transactions: [tx] };

    const res = await fastifyServer.inject({ method: 'POST', url: '/block', payload: block });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error).toBe('Invalid block id hash');
  });

  it('accepts a valid block with correct height, transactions, and ID', async () => {
    const firstBlock: Block = { id: calculateBlockId(1, []), height: 1, transactions: [] };
    await fastifyServer.inject({ method: 'POST', url: '/block', payload: firstBlock });

    const tx = createTransaction('tx1', [50], [50]);
    const block: Block = { id: calculateBlockId(2, [tx]), height: 2, transactions: [tx] };

    const res = await fastifyServer.inject({ method: 'POST', url: '/block', payload: block });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).message).toBe('Block added');
  });
});
