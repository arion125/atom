import { PublicKey } from "@solana/web3.js";
import { password } from "@inquirer/prompts";
import { decryptKeypair } from "./decryptKeypair";

/* export const getKeypairFromSecret = async (pubkey: PublicKey): Promise<Keypair> => {
  const inputPwd = await password({
    message: "Enter your password to start:",
    validate: (input) => {
      const secret = Buffer.from(input);
      const keypair = decryptKeypair(secret, pubkey);

      if (keypair.type !== "Success") {
        return "Wrong password or incorrect keypair, please retry";
      }

      return true;
    },
  });

  const secret = Buffer.from(inputPwd);
  const keypair = decryptKeypair(secret, pubkey);

  if (keypair.type !== "Success") {
    console.log("Wrong password or incorrect keypair, please retry");

    process.exit(1);
  }

  return keypair.result;
}; */

export const getPassword = async (pubkey: PublicKey): Promise<string> => {
  const inputPwd = await password({
    message: "Enter your password to start:",
    validate: (input) => {
      const secret = Buffer.from(input);
      const keypair = decryptKeypair(secret, pubkey);

      if (keypair.type !== "Success")
        return "Wrong password or incorrect keypair, please retry";

      return true;
    },
  });

  return inputPwd;
};
