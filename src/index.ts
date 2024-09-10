import * as readline from "readline";
import { QueueManager } from "./classes/QueueManager";
import { Base64ToJsonError, KeypairNotFoundError } from "../common/errors";
import { PublicKey } from "@solana/web3.js";
import { KeypairManager } from "./classes/KeypairManager";
import { getPlan } from "../apis/getPlan";
import { base64ToJson } from "../utils/base64ToJson";
import { setKeypair } from "../utils/keypair/setKeypair";
import { Command } from "commander";
import { removeKeypair } from "../utils/keypair/removeKeypair";

const test = async () => {
  const program = new Command();

  program.name("atom");

  program.command("add-wallet").action(async () => {
    await setKeypair();
  });

  program.command("remove-wallet <publicKey>").action((pubkey) => {
    removeKeypair(new PublicKey(pubkey));
  });

  await program.parseAsync(process.argv);
};
test();

const main = () => {
  const keypairManager = new KeypairManager();
  const queueManager = new QueueManager(keypairManager);

  // Leggi l'input dalla riga di comando
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  /*   // Sostituisci l'ultimo comando dell'utente inviato con un messaggio personalizzato
  function replaceLastLine(message: string) {
    process.stdout.moveCursor(0, -1);
    process.stdout.clearLine(0);
    process.stdout.write('ATOM PROMPT: ' + message + '\n');
  } */

  // Legge e processa i comandi scritti dall'utente in riga di comando
  // FIX: valutare eventuali vulnerabilità
  const readCommand = () => {
    rl.question("Atom Prompt: ", async (data) => {
      const input = data.toString().trim();

      if (input.startsWith("start plan ")) {
        // start plan [walletName] [planName]
        try {
          const [pubkeyString, ...planNameParts] = input
            .replace("start plan ", "")
            .split(" ");
          const pubkey = new PublicKey(pubkeyString);
          const planName = planNameParts.join(" ");
          const planData = await getPlan({ pubkey, planName });
          const plan = base64ToJson(planData.base64Script);
          await queueManager.addQueue(plan);
          console.log(`${plan.name} started successfully`);
        } catch (e) {
          if (e instanceof Base64ToJsonError) console.log(e.message);
          if (e instanceof KeypairNotFoundError) console.log(e.message);
          else console.log(`Something went wrong, please try again. Error: ${e}`);
        }
      } else if (input.startsWith("stop plan ")) {
        // stop plan [planName]
        try {
          const name = input.replace("stop plan ", "");
          queueManager.removeQueue(name);
          console.log("Plan stopped and removed");
        } catch (e) {
          console.log("Invalid plan name");
        }
      } else if (input === "stop atom") {
        try {
          rl.close();
          console.log("Atom stopped");
          return;
        } catch (e) {
          console.log("Something went wrong, Atom keeps running");
        }
      } else if (input.startsWith("add wallet")) {
        // TODO: add wallet
        // 1. inquirer prompts start
        // 2. user provide a wallet custom and readable name (saved in the first row of a file)
        // 3. user paste wallet private key in a password type field
        // 4. user provide a secure password needed to crypt the key in a file
        try {
          /* keypairManager.addKeypair(
            Keypair.fromSecretKey(
              bs58.decode(input.replace('add wallet ', '')),
            ),
          ); */
        } catch (e) {}
      } else if (input.startsWith("remove wallet ")) {
        // remove wallet [wallet name]
        // 1. user provide the wallet name
        // 2. the keypair file is deleted
        try {
          const pbk = new PublicKey(input.replace("remove wallet ", ""));
          keypairManager.removeKeypair(pbk);
          console.log("Keypair removed successfully");
        } catch (e) {
          console.log("Invalid public key");
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

// main();
