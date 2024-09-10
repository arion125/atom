import { PublicKey } from "@solana/web3.js";
import { InvalidPublicKeyError } from "../common/errors";

// Funzione di utility per convertire una stringa in un oggetto PublicKey
export const parsePublicKey = (pubkey: string): PublicKey => {
  try {
    return new PublicKey(pubkey);
  } catch (e) {
    throw new InvalidPublicKeyError(pubkey);
  }
};
