import crypto from 'crypto';
import type { Block, Transaction, Input, Output } from '../src/interfaces.ts';

function sha256(data: string) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// --- Block 1: First Block ---
const tx1: Transaction = {
  id: 'tx1',
  inputs: [],
  outputs: [
    { address: 'addrA', value: 50 },
    { address: 'addrB', value: 30 },
  ],
};

const tx2: Transaction = {
  id: 'tx2',
  inputs: [],
  outputs: [
    { address: 'addrC', value: 20 },
  ],
};

const block1: Block = {
  height: 1,
  id: sha256('1' + tx1.id + tx2.id),
  transactions: [tx1, tx2],
};

// --- Block 2: spends some outputs from Block 1 ---
const tx3: Transaction = {
  id: 'tx3',
  inputs: [
    { txId: 'tx1', index: 0 }, // spends addrA:50
  ],
  outputs: [
    { address: 'addrD', value: 50 },
  ],
};

const tx4: Transaction = {
  id: 'tx4',
  inputs: [],
  outputs: [
    { address: 'addrE', value: 15 },
    { address: 'addrF', value: 5 },
  ],
};

const block2: Block = {
  height: 2,
  id: sha256('2' + tx3.id + tx4.id),
  transactions: [tx3, tx4],
};

// --- Block 3: spends multiple previous outputs ---
const tx5: Transaction = {
  id: 'tx5',
  inputs: [
    { txId: 'tx1', index: 1 }, // spends addrB:30
    { txId: 'tx4', index: 0 }, // spends addrE:15
    { txId: 'tx4', index: 1 }, // spends addrF:5
  ],
  outputs: [
    { address: 'addrG', value: 50 },
  ],
};

const block3: Block = {
  height: 3,
  id: sha256('3' + tx5.id),
  transactions: [tx5],
};

// --- Block 4: multiple transactions with mixed outputs ---
const tx6: Transaction = {
  id: 'tx6',
  inputs: [
    { txId: 'tx3', index: 0 }, // spends addrD:50
  ],
  outputs: [
    { address: 'addrH', value: 30 },
    { address: 'addrI', value: 20 },
  ],
};

const tx7: Transaction = {
  id: 'tx7',
  inputs: [
    { txId: 'tx5', index: 0 }, // spends addrG:50
  ],
  outputs: [
    { address: 'addrJ', value: 50 },
  ],
};

const block4: Block = {
  height: 4,
  id: sha256('4' + tx6.id + tx7.id),
  transactions: [tx6, tx7],
};

// Export all blocks
export const mockSuccessBlocks: Block[] = [block1, block2, block3, block4];