import { Pool } from "pg";
import { randomUUID, createHash } from 'crypto';
import type { Output, Transaction, Input, Block } from "./interfaces";

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

/**
 * Compute the expected block ID as sha256(height + tx1.id + tx2.id + ...)
 */
function computeBlockId(block: Omit<Block, "id">): string {
  const data = block.height.toString() + block.transactions.map(tx => tx.id).join("");
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Validate block ID
 */
export const validateBlockId = (block: Block): boolean => {
  const expectedId = computeBlockId({ height: block.height, transactions: block.transactions });
  return block.id === expectedId;
}

export const blockValidation = async(pool: Pool, rep: any, blocks: Block[]) => {
    let transactions: Transaction[] | string;
    let inputs = null;
    let outputs = null;

    const firstHeight = blocks[0]['height'];

    if (firstHeight !== 1) {
        rep.code(404).send({ msg: "First height should be equal to 1." });
    }

    blocks.forEach((block: Block) => {
        transactions = block.transactions;

        Object.entries(transactions).forEach(el => {
            inputs = el[1].inputs;
            outputs = el[1].outputs;
        })

        const height = block.height;
        if (firstHeight > height) {
            rep.code(404).send({ msg: "First height should be smaller than second one." });
        } else if (height - firstHeight >= 2) {
            rep.code(404).send({ msg: "Current height should be exactly one unit higher than previous one." });
        }

        // Compute the ID
        block.id = computeBlockId({ height: block.height, transactions: block.transactions });

        console.log("Block ID:", block.id);
        console.log("Valid ID?", validateBlockId(block)); // true

        if (!validateBlockId(block)) {
            rep.code(404).send({ msg: "Block id is incorrect." });
        }

    });

  return {msg: "validation done"};
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

  const transJson = JSON.stringify(transactions);

  const block: {id: string, height: number, transactions: string}[] = [{
    id: randomUUID(),
    height: 3,
    transactions: transJson
  }];

  await pool.query(`
    INSERT INTO blocks(id, height, transactions) 
    VALUES ($1, $2, $3)`, [block[0].id, block[0].height, block[0].transactions]);
}