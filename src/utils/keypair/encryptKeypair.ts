import { Keypair } from "@solana/web3.js";
import { encrypt } from "./crypto";
import { CryptoContent } from "../../types/types";

export const encryptKeypair = async (
  secret: Buffer,
  keypair: Keypair,
): Promise<CryptoContent> => {
  const encryptedKeypair = await encrypt(keypair, secret);

  if (encryptedKeypair.type !== "Success")
    throw new Error(`Encryption Failed, please retry. Error: ${encryptedKeypair.type}`);

  return encryptedKeypair.result as CryptoContent;
};
