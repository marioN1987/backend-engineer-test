import type{ Block, Transaction } from '../src/interfaces';

export const blockchain: Block[] = [];

export function addBlock(block: Block) {
  validateBlock(block);
  blockchain.push(block);
}

export function validateBlock(block: Block) {
  const lastBlock = blockchain[blockchain.length - 1];

  // 1. First block
  if (!lastBlock && block.height !== 1) {
    throw new Error('Invalid block height');
  }

  // 2. Non-first block height
  if (lastBlock && block.height !== lastBlock.height + 1) {
    throw new Error('Invalid block height');
  }

  // 3. Transactions sum validation (only if array)
  if (Array.isArray(block.transactions)) {
    for (const tx of block.transactions) {
      const outputSum = tx.outputs.reduce((a, o) => a + o.value, 0);
      // Inputs don’t have value now, so we skip input sum validation
      if (outputSum <= 0) {
        throw new Error(`Invalid transaction outputs sum ${outputSum}`);
      }
    }
  }

  // 4. Block ID uniqueness
  if (blockchain.some(b => b.id === block.id)) {
    throw new Error('Invalid block id');
  }
}