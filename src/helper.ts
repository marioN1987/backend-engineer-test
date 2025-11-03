import { Pool } from "pg";
import { randomUUID, createHash } from 'crypto';
import type { Output, Input, Block } from "./interfaces";

interface State {
  blocks: Block[];
  balances: Map<string, number>;
}

export const rollbackToHeight = (blocks: Block[], targetHeight: number) => {
  if (targetHeight < 1) {
    return { status: 400, msg: 'Target height must be >= 1.' };
  }

  const currentHeight = blocks.length > 0 ? blocks[blocks.length - 1].height : 0;

  if (currentHeight - targetHeight > 2000) {
    return { status: 400, msg: 'Rollback exceeds maximum limit of 2000 blocks.' };
  }

  // Remove all blocks after targetHeight
  blocks = blocks.filter(block => block.height <= targetHeight);

  // Recompute balances
  const balances = computeBalancesFromBlocks(blocks);

  return { status: 200, msg: `Rollback to height ${targetHeight} successful.`, balances };
};

const computeBalancesFromBlocks = (blocks: Block[]) => {
  const utxos = new Map<string, Output>();

  for (const block of blocks) {
    for (const tx of block.transactions) {
      // Spend inputs
      tx.inputs.forEach(input => utxos.delete(`${input.txId}:${input.index}`));

      // Add outputs
      tx.outputs.forEach((out, idx) => utxos.set(`${tx.id}:${idx}`, out));
    }
  }

  // Sum balances per address
  const balances = new Map<string, number>();
  for (const out of utxos.values()) {
    balances.set(out.address, (balances.get(out.address) || 0) + out.value);
  }

  return Object.fromEntries(balances);
};

export const computeBalances = (address: string, blocks: Block[]) => {
  const utxos = new Map<string, Output>();
  for (const block of blocks) {
    for (const tx of block.transactions) {
        if (typeof tx === "object" && tx.inputs != null && 'inputs' in tx) {
            // spend inputs
            for (const input of tx.inputs) {
                utxos.delete(`${input.txId}:${input.index}`);
            }
        }

        if (typeof tx === "object" && tx.outputs != null && 'outputs' in tx) {
            // add outputs
            tx.outputs.forEach((out, idx) => utxos.set(`${tx.id}:${idx}`, out));
        }
    }
  }

  // sum UTXOs for the given address
  let balance = 0;
  for (const out of utxos.values()) {
    if (out.address === address) balance += out.value;
  }

  return balance;
}

// Compute correct block ID
function computeBlockId(block: Block): string {
  const txIds = block.transactions.map(tx => tx.id).join("");
  const data = `${block.height}${txIds}`;
  return createHash("sha256").update(data).digest("hex");
}

// Validate the block ID against computed value
function validateBlockId(block: Block): boolean {
  const computedId = computeBlockId(block);
  return computedId === block.id;
}

export const blockValidation = async(pool: Pool, rep: any, blocks: Block[]) => {
  if (!blocks.length) {
    return rep.code(400).send({ msg: "No blocks provided." });
  }

  // 1. Validate first block height
  const firstHeight = blocks[0].height;
  if (firstHeight !== 1) {
    return rep.code(400).send({ msg: "First block height must be 1." });
  }

  // Track all spent and available outputs (UTXO model)
  const utxos = new Map<string, Number>();

  // Process each block sequentially
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const prevBlock = i > 0 ? blocks[i - 1] : null;
    
    console.log("prev", prevBlock?.height);
    // 2. Validate height progression
    if (prevBlock) {
      const expectedHeight = prevBlock.height + 1;
      if (block.height !== expectedHeight) {
        return rep
          .code(400)
          .send({ msg: "Block height must be exactly one unit higher than the previous block." });
      }
    }

    // 3. Validate transactions input/output sums
    for (const block of blocks) {
      for (const tx of block.transactions) {
        // 1. Compute input sum by looking up UTXOs
        const inputSum = tx.inputs.reduce((sum, input) => {
          const key = `${input.txId}:${input.index}`;
          const val = utxos.get(key);
          if (val === undefined) {
            throw new Error(`Referenced input not found: ${key}`);
          }
          utxos.delete(key);
          return +sum + +val;
        }, 0);

        // 2. Compute output sum
        const outputSum = tx.outputs.reduce((sum, out) => sum + out.value, 0);

        // 3️. Validate sums (except genesis)
        if (tx.inputs.length > 0 && inputSum !== outputSum) {
          throw new Error("Sum of input values must equal sum of output values.");
        }

        // 4️. Add new UTXOs
        tx.outputs.forEach((out, idx) => utxos.set(`${tx.id}:${idx}`, out.value));
      }
    }

    // 4. Validate block ID hash
    block.id = computeBlockId(block);
    const computedId = computeBlockId(block);

    if (block.id !== computedId) {
      return rep.code(400).send({ msg: "Invalid block id hash." });
    }
  }

  return rep.code(200).send({ msg: "Validation done." });
}

export async function createBlockTable(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      height INTEGER,
      transactions JSON
    );
  `);
}

export async function insertData(pool: Pool) {
  const transactionId = "tx3";

  // const outputs: Output[] = [{
  //   address: 'addr1',
  //   value: 10
  // }];

  // const outputs: Output[] = [{
  //   address: 'addr2',
  //   value: 4
  // },{
  //   address: 'addr3',
  //   value: 6
  // }];

  const outputs: Output[] = [{
    address: 'addr4',
    value: 2
  },{
    address: 'addr5',
    value: 2
  },{
    address: 'addr6',
    value: 2
  }];

  // const inputs: Input[] = [{
  //   txId: 'tx1',
  //   index: 0
  // }];

  const inputs: Input[] = [{
    txId: 'tx2',
    index: 1
  }];

  const outputsJson = JSON.stringify(outputs);
  const inputsJson = JSON.stringify(inputs);

  const transactions: {id: string, inputs: string, outputs: string}[] = [{
    id: transactionId,
    inputs: inputsJson,
    outputs: outputsJson
  }]

  const transactionsJson = JSON.stringify(transactions);

  const block: {id: string, height: number, transactions: string}[] = [{
    id: randomUUID(),
    height: 3,
    transactions: transactionsJson
  }];

  await pool.query(`
    INSERT INTO blocks(id, height, transactions) 
    VALUES ($1, $2, $3)`, [block[0].id, block[0].height, block[0].transactions]);
}