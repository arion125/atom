import { PublicKey } from "@solana/web3.js";
import { IPCPacket } from "./types/types";
import { decryptKeypair } from "./utils/keypair/decryptKeypair";
import { getPlan } from "./apis/getPlan";

/* const processArgs = (args: string[]): { planName: string; publicKey: PublicKey } => {
  const planNameArg = args.find((arg) => arg.startsWith("--planName="));
  const publicKeyArg = args.find((arg) => arg.startsWith("--publicKey="));

  const planName = planNameArg ? planNameArg.split("=")[1] : null;
  const publicKeyStr = publicKeyArg ? publicKeyArg.split("=")[1] : null;

  console.log("Plan name:", planName, "| Public key:", publicKeyStr);

  if (!planName || !publicKeyStr) {
    console.error("Missing plan name or public key");
    process.exit(1);
  }

  let publicKey: PublicKey;
  try {
    publicKey = new PublicKey(publicKeyStr);
  } catch (error) {
    console.error("Invalid public key");
    process.exit(1);
  }

  return { planName, publicKey };
};

const args = processArgs(process.argv.slice(2)); */

process.on("message", async (packet: IPCPacket) => {
  if (
    packet.type === "process:msg" &&
    packet.data.planName &&
    packet.data.publicKey &&
    packet.data.pwd
  ) {
    const planName = packet.data.planName;
    const publicKey = new PublicKey(packet.data.publicKey);
    const pwd = packet.data.pwd;

    const secret = Buffer.from(pwd);
    const keypair = decryptKeypair(secret, publicKey);

    if (keypair.type !== "Success") {
      console.log("Wrong password or incorrect keypair");
      process.exit(1);
    }

    await main(planName, publicKey);
  }
});

const main = async (planName: string, pubkey: PublicKey) => {
  const plan = await getPlan({ planName, pubkey });
  console.log("Plan:", plan.base64Script.substring(0, 32), "...");
  // const queueManager = new QueueManager();

  setInterval(() => {
    console.log(`Hello ${pubkey.toBase58()}. Plan: ${planName}`);
  }, 1000);
};
