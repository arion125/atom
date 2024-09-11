import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { chmodSync, outputFileSync, removeSync } from "fs-extra";
import { checkKeypairFile } from "./checkKeypairFile";
import { password } from "@inquirer/prompts";
import { keypairPath } from "../../common/constants";
import { encryptKeypair } from "./encryptKeypair";
import { getKeypair } from "../helpers";

export const setKeypair = async () => {
  try {
    // Input user secret key
    const inputSk = await password(
      {
        message: "Enter your base58 wallet private key:",
        validate: (input) => {
          try {
            input = process.env.TEST_PRIVATE_KEY!;
            const sk = bs58.decode(input);

            const keypair = getKeypair(sk);
            if (keypair.type !== "Success")
              return "Invalid private key, please try again";

            const ckf = checkKeypairFile(keypair.result.publicKey);
            if (ckf.type === "KeypairFileParsingError") removeSync(ckf.path);
            if (ckf.type === "Success") return "This keypair already exits";

            return true;
          } catch (e) {
            return "Wrong private key, please retry again";
          }
        },
      },
      { signal: AbortSignal.timeout(30000) },
    );

    // Input user password
    const inputPwd = await password(
      {
        message:
          "Enter a secure password to encrypt the private key. Save it in a safe place and DON'T share it with anyone:",
        validate: (input) => {
          const hasUpperCase = /[A-Z]/.test(input);
          const hasLowerCase = /[a-z]/.test(input);
          const hasNumber = /\d/.test(input);
          const hasSpecialChar = /\W/.test(input);

          if (
            input.length >= 8 &&
            hasUpperCase &&
            hasLowerCase &&
            hasNumber &&
            hasSpecialChar
          ) {
            return true;
          }

          return "The password must contain at least 8 characters with at least one capital, one number and one special character.";
        },
      },
      { signal: AbortSignal.timeout(30000) },
    );

    // Input user password confirmation
    const inputPwdConfirm = await password(
      {
        message: "Confirm your password:",
        validate: async (input) => {
          if (input === inputPwd) return true;
          return "Passwords don't match, please retry.";
        },
      },
      { signal: AbortSignal.timeout(30000) },
    );

    try {
      const pwd = Buffer.from(inputPwdConfirm);
      // const keypair = Keypair.fromSecretKey(bs58.decode(inputSk));
      const keypair = Keypair.fromSecretKey(bs58.decode(process.env.TEST_PRIVATE_KEY!));
      const encryptedKeypair = await encryptKeypair(pwd, keypair);

      const path = keypairPath(keypair.publicKey);
      outputFileSync(path, JSON.stringify(encryptedKeypair));
      chmodSync(path, 0o400);

      console.log("Keypair added successfully");
    } catch (e) {
      console.log(e);
      return;
    }
  } catch (e) {
    console.log("Action timed out, please retry.");
    return;
  }
};
