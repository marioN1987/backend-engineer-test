import Fastify from 'fastify';
import { Pool } from 'pg';
import { randomInt, randomUUID, type UUID } from 'crypto';
import { isNullishCoalesce } from 'typescript';

const fastify = Fastify({ logger: true });

interface Output {
  address: string;
  value: number;
}

interface Input {
  txId: string;
  index: number;
}

interface Transaction {
  id: string;
  inputs: Array<Input> | string | null;
  outputs: Array<Output> | string | null;
}

interface Block {
  id: string;
  height: number;
  transactions: Array<Transaction> | string;
}

const blockValidation = async(req: any, rep: any, block: any) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({
    connectionString: databaseUrl
  });

  const result = await pool.query("SELECT * FROM blocks");

  let height = 0;
  let transactions: Transaction[] | string;
  let inputs = null;
  let outputs = null;

  const firstHeight = block[0]['height'];

  if (firstHeight !== 1) {
    rep.code(404).send({ msg: "First height should be equal to 1." });
  }

  block.forEach((row: Block) => {

    transactions = row['transactions'];

    console.log("**", transactions);

    const height = row.height;
    if (firstHeight > height) {
      rep.code(404).send({ msg: "First height should be smaller than second one." });
    } else if (height - firstHeight >= 2) {
      rep.code(404).send({ msg: "Current height should be exactly one unit higher than previous one." });
    }

  });


  // result.rows.forEach(el => {
  //   height = el['height'];

  //   if (firstHeight > height) {
  //     rep.code(404).send({ msg: "First height should be smaller than second one." });
  //   } else if (height - firstHeight > 2) {
  //     rep.code(404).send({ msg: "Current height should be exactly one unit higher than previous one." });
  //   }

  //   transactions = el['transactions'];

  //   const converted = JSON.parse(transactions);

  //   inputs = converted.filter(el => el.inputs);
  //   outputs = converted.filter(el => el.outputs);
  // });

  return {msg: "sdf"};
}

fastify.get('/blocks', async (req, rep) => {
  let body = '';
  for await (const data of req.raw) {
    body += data.toString();
  }

  const converted = JSON.parse(body).blocks;
  return await blockValidation(req, rep, converted);
});

fastify.post('/balance/address', async () => {
  return { hello: 'world' };
});

fastify.post('/rollback?height=number', async () => {
  return { hello: 'world' };
});

async function insertData(pool: Pool) {
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

  const transactions: Transaction[] = [{
    id: transactionId,
    inputs: inputsJson,
    outputs: outputsJson
  }]

  const transJson = JSON.stringify(transactions);

  const block : Block[] = [{
    id: randomUUID(),
    height: 3,
    transactions: transJson
  }];

  await pool.query(`
    INSERT INTO blocks(id, height, transactions) 
    VALUES ($1, $2, $3)`, [block[0].id, block[0].height, block[0].transactions]);
}

async function createTables(pool: Pool) {
  await createBlockTable(pool);
}

async function createBlockTable(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      height INTEGER,
      transactions JSON
    );
  `);
}

async function getBlocksWithTransactions(pool: Pool) {
    pool.query("SELECT * FROM blocks", 
        (err, results) => {
          if (err) { console.log(err); };
          const {rows} = results;
          
          let height = 0;
          let transactions: string = "";
          let inputs = null;
          let outputs = null;
          rows.forEach(el => {
            height = el['height']; 
            transactions = el['transactions'];

            const converted = JSON.parse(transactions);

            inputs = converted.filter((el:any) => el.inputs);
            outputs = converted.filter((el:any) => el.outputs);
          });

          console.log("--", transactions, height);
          
          //transactions.forEach((el => Object.entries(el).forEach(el1 => console.log(el1))));

          const groupedByBlock = rows.reduce((acc, row) => {
            const { block_height, transaction_id, input_txid, input_index, output_addres, output_value } = row;

            // find or create block
            let block = acc.find((b: Block) => b.height === block_height);
            if (!block) {
              block = { height: block_height, transactions: [] };
              acc.push(block);
            }

            // find or create transaction
            let tx = block.transactions.find((t: Transaction) => t.id === transaction_id);
            if (!tx) {
              tx = { id: transaction_id, inputs: [], outputs: [] };
              block.transactions.push(tx);
            }

            if (input_txid != null) {
                // add input (avoid duplicates)
                const inputExists = tx.inputs.some((i: Input) => i.txId === input_txid && i.index === input_index);
                if (!inputExists) {
                  tx.inputs.push({ txId: input_txid, index: input_index });
                }
            }

            // add output
            tx.outputs.push({ address: output_addres, value: output_value });

            return acc;
          }, []);

          // If you only want one block (not array)
          //const result = rows.length === 1 ? groupedByBlock[0] : groupedByBlock;

          //console.log(result);
        }
  );
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

  //await createTables(pool);
  //await insertData(pool);
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