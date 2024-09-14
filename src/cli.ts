import { PublicKey } from "@solana/web3.js";
import {
  Argument,
  Command,
  InvalidArgumentError,
  InvalidOptionArgumentError,
} from "commander";
import pm2 from "pm2";
import { KeypairManager } from "./queues/KeypairManager";
import { setKeypair } from "./utils/keypair/setKeypair";
import { removeKeypair } from "./utils/keypair/removeKeypair";
import { getPassword } from "./utils/keypair/getPassword";
import { IPCPacket } from "./types/types";

export const cli = () => {
  const keypairManager = new KeypairManager();

  const program = new Command();

  program.name("atom");

  const wallet = program.command("wallet");

  /* wallet
    .command("add")
    .addArgument(
      new Argument("<secretKey>", "The secret key of the wallet").argParser(
        (secretKey) => {
          try {
            return Keypair.fromSecretKey(bs58.decode(secretKey));
          } catch {
            throw new InvalidArgumentError("Invalid secret key");
          }
        },
      ),
    )
    .description("Add a new wallet")
    .action((keypair: Keypair) => {
      keypairManager.addKeypair(keypair);
      console.log(`Added wallet ${keypair.publicKey.toString()}`);
    }); */

  wallet
    .command("add")
    .description("Add a new wallet")
    .action(async () => {
      await setKeypair();
    });

  wallet
    .command("remove")
    .addArgument(
      new Argument("<publicKey>", "The public key of the wallet").argParser((pubkey) => {
        try {
          return new PublicKey(pubkey);
        } catch {
          throw new InvalidArgumentError("Invalid publicKey key");
        }
      }),
    )
    .description("Remove a wallet")
    .action((publicKey: PublicKey) => {
      /* keypairManager.removeKeypair(publicKey);
      console.log(`Wallet removed ${publicKey.toString()}`); */
      removeKeypair(publicKey);
    });

  const plan = program.command("plan");

  plan
    .command("start <plan>")
    .requiredOption(
      "-p, --pubkey <publicKey>",
      "The publicKey of the keypair to use",
      (value) => {
        try {
          return new PublicKey(value);
        } catch {
          throw new InvalidOptionArgumentError("Invalid public key");
        }
      },
    )
    .action(async (planName, { pubkey: publicKey }: { pubkey: PublicKey }) => {
      const pwd = await getPassword(publicKey);
      // const args = [`--planName=${planName}`, `--publicKey=${publicKey.toBase58()}`];

      console.log("Starting plan", planName);

      pm2.connect((err) => {
        if (err) {
          console.error(err);
          process.exit(2);
        }

        pm2.start(
          {
            script: "node dist/queue.js",
            name: planName,
            // args,
          },
          (err) => {
            if (err) {
              console.error("Error while starting the process:", err);
              process.exit(1);
            }

            console.log("Process started");

            pm2.list((err, list) => {
              if (err) {
                console.error("Error while listing processes:", err);
                process.exit(1);
              }

              console.log("Process", list[0].pm_id);

              const pmId = list[0].pm_id;
              const packet: IPCPacket = {
                type: "process:msg",
                data: {
                  planName,
                  publicKey,
                  pwd,
                },
                topic: "process",
              };

              if (pmId === undefined) {
                console.error("Error while starting the process:", "pm_id not found");
                process.exit(1);
              }

              console.log("Sending password to process", pmId);

              pm2.sendDataToProcessId(pmId, packet, (err) => {
                if (err) {
                  console.error("Error while sending password to process:", err);
                  process.exit(1);
                } else {
                  console.log("Password sent to process");
                  pm2.disconnect();
                  process.exit(0);
                }
              });
            });
          },
        );
      });
    });

  program.parse(process.argv);
};

// cli();
