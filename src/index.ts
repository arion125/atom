// src/index.ts

import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { QueueManager } from './classes/QueueManager';
import { Base64ToJsonError, KeypairNotFoundError } from '../common/errors';
import { Plan, PlanRaw } from '../types/types';
import bs58 from 'bs58';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { KeypairManager } from './classes/KeypairManager';
import { getPlan } from '../apis/getPlan';
import { parsePlan } from '../utils/parsePlan';

import { Ship, SAGE_IDL } from '@staratlas/sage';
import { readAllFromRPC } from '@staratlas/data-source';
import { AnchorProvider, Wallet, Program } from '@staratlas/anchor';

dotenv.config();

const test = async () => {};
// test();

const main = () => {
  const keypairManager = new KeypairManager();
  const queueManager = new QueueManager(keypairManager);

  // Processa la stringa in base64 per convertirla in json e crea la coda
  const base64ToJson = (input: string): Plan => {
    try {
      const decodedInput = Buffer.from(input, 'base64').toString('utf8');
      const planRaw: PlanRaw = JSON.parse(decodedInput);
      const plan: Plan = parsePlan(planRaw);
      return plan;
    } catch (e) {
      throw new Base64ToJsonError();
    }
  };

  // Leggi l'input dalla riga di comando
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  // Sostituisci l'ultimo comando dell'utente inviato con un messaggio personalizzato
  function replaceLastLine(message: string) {
    process.stdout.moveCursor(0, -1);
    process.stdout.clearLine(0);
    process.stdout.write('ATOM PROMPT: ' + message + '\n');
  }

  // Legge e processa i comandi scritti dall'utente in riga di comando
  // FIX: valutare eventuali vulnerabilità
  const readCommand = () => {
    rl.question('ATOM PROMPT: ', async (data) => {
      const input = data.toString().trim();

      if (input.startsWith('start plan ')) {
        // start plan [walletName] [planName]
        try {
          const [pubkeyString, ...planNameParts] = input
            .replace('start plan ', '')
            .split(' ');
          const pubkey = new PublicKey(pubkeyString);
          const planName = planNameParts.join(' ');
          const planData = await getPlan({ pubkey, planName });
          const plan = base64ToJson(planData.base64Script);
          await queueManager.addQueue(plan);
          replaceLastLine(`${plan.name} started successfully`);
        } catch (e) {
          if (e instanceof Base64ToJsonError) replaceLastLine(e.message);
          if (e instanceof KeypairNotFoundError) replaceLastLine(e.message);
          else
            replaceLastLine(
              `Something went wrong, please try again. Error: ${e}`,
            );
        }
      } else if (input.startsWith('stop plan ')) {
        // stop plan [planName]
        try {
          const name = input.replace('stop plan ', '');
          queueManager.removeQueue(name);
          replaceLastLine('Plan stopped and removed');
        } catch (e) {
          replaceLastLine('Invalid plan name');
        }
      } else if (input === 'stop atom') {
        try {
          rl.close();
          replaceLastLine('Atom stopped');
          return;
        } catch (e) {
          replaceLastLine('Something went wrong, Atom keeps running');
        }
      } else if (input.startsWith('add wallet ')) {
        // TODO: add wallet
        // 1. inquirer prompts start
        // 2. user provide a wallet custom and readable name (saved in the first row of a file)
        // 3. user paste wallet private key in a password type field
        // 4. user provide a secure password needed to crypt the key in a file
        try {
          keypairManager.addKeypair(
            Keypair.fromSecretKey(
              bs58.decode(input.replace('add wallet ', '')),
            ),
          );
          replaceLastLine('Keypair added successfully');
        } catch (e) {
          replaceLastLine('Invalid private key');
        }
      } else if (input.startsWith('remove wallet ')) {
        // remove wallet [wallet name]
        // 1. user provide the wallet name
        // 2. the keypair file is deleted
        try {
          const pbk = new PublicKey(input.replace('remove wallet ', ''));
          keypairManager.removeKeypair(pbk);
          replaceLastLine('Keypair removed successfully');
        } catch (e) {
          replaceLastLine('Invalid public key');
        }
      }

      // help
      // change rpc
      // change priority
      // list active plans
      // list wallets
      // check quattrini
      // update plans

      readCommand();
    });
  };

  readCommand();

  // Controlla le code ogni secondo
  setInterval(() => {
    queueManager.processQueues();
  }, 1000);
};

main();
