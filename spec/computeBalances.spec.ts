import { computeBalances } from '../src/helper.ts';
import Fastify from 'fastify';
import type { Block } from '../src/interfaces.ts';
import { randomUUID } from 'crypto';

// Mock blockchain data
const mockBlocks: Block[] = [
  {
    id: randomUUID(),
    height: 1,
    transactions: [
      {
        id: 'tx1',
        inputs: [],
        outputs: [
          { address: 'addrA', value: 50 },
          { address: 'addrB', value: 25 },
        ],
      },
      {
        id: 'tx2',
        inputs: [],
        outputs: [{ address: 'addrA', value: 75 }],
      },
    ],
  },
  {
    id: randomUUID(),
    height: 2,
    transactions: [
      {
        id: 'tx3',
        // Spends addrA’s first UTXO (tx1:0)
        inputs: [{ txId: 'tx1', index: 0 }],
        outputs: [{ address: 'addrC', value: 50 }],
      },
      {
        id: 'tx4',
        inputs: [],
        outputs: [
          { address: 'addrB', value: 100 },
          { address: 'addrA', value: 10 },
        ],
      },
    ],
  },
  {
    id: randomUUID(),
    height: 3,
    // Example: this block has a string instead of valid transactions
    transactions: [],
  },
];

function registerRoutes(fastify: any) {
  fastify.get('/balance/:address', async (req: any, rep: any) => {
    const { address } = req.params as { address: string };
    const computedBalance = computeBalances(address, mockBlocks);
    return { balance: computedBalance };
  });
}

describe('GET /balance/:address', () => {
  const fastify = Fastify();

  beforeAll(async () => {
    registerRoutes(fastify);
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  it('should return correct balances for mock blockchain', async () => {
    const resA = await fastify.inject({ method: 'GET', url: '/balance/addrA' });
    const resB = await fastify.inject({ method: 'GET', url: '/balance/addrB' });
    const resC = await fastify.inject({ method: 'GET', url: '/balance/addrC' });

    expect(resA.statusCode).toBe(200);
    expect(JSON.parse(resA.payload)).toEqual({ balance: 85 }); // 50+75-50+10

    expect(resB.statusCode).toBe(200);
    expect(JSON.parse(resB.payload)).toEqual({ balance: 125 }); // 25+100

    expect(resC.statusCode).toBe(200);
    expect(JSON.parse(resC.payload)).toEqual({ balance: 50 }); // only tx3
  });
});
