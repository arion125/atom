import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import {
  Argument,
  Command,
  InvalidArgumentError,
  InvalidOptionArgumentError,
} from "commander";
import { createAtom } from ".";
import { KeypairManager } from "./queues/KeypairManager";

const cli = () => {
  const keypairManager = new KeypairManager();

  const atom = createAtom();

  const program = new Command();

  program.name("atom");

  const wallet = program.command("wallet");

  wallet
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
      keypairManager.removeKeypair(publicKey);

      console.log(`Wallet removed ${publicKey.toString()}`);
    });

  const plan = program.command("plan");

  plan
    .command("start <plan>")
    .requiredOption(
      "-k, --keypair <publicKey>",
      "The publicKey of the keypair to use",
      (value) => {
        try {
          return new PublicKey(value);
        } catch {
          throw new InvalidOptionArgumentError("Invalid public key");
        }
      },
    )
    .action((planName, { keypair: publicKey }: { keypair: PublicKey }) =>
      atom.startPlan({ plan: planName, keypair: keypairManager.getKeypair(publicKey) }),
    );

  program.parse(process.argv);
};

cli();
