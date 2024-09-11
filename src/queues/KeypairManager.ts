// src/KeypairManager.ts

import { Keypair, PublicKey } from "@solana/web3.js";
import {
  KeypairAlreadyExistsError,
  KeypairNotExistsError,
  KeypairNotFoundError,
} from "../common/errors";

const keypairs: Map<string, Keypair> = new Map();

export class KeypairManager {
  /**
   * Adds a new keypair to the manager.
   * @param keypair The keypair to be added.
   * @throws KeypairAlreadyExistsError if a keypair with the same publicKey already exists.
   */
  addKeypair(keypair: Keypair) {
    if (keypairs.has(keypair.publicKey.toString())) {
      throw new KeypairAlreadyExistsError(keypair.publicKey);
    }
    keypairs.set(keypair.publicKey.toBase58(), keypair);
  }

  /**
   * Removes a keypair based on the publicKey.
   * @param pubkey The public key of the pair to be removed.
   * @throws KeypairNotExistsError if the keypair with the specified publicKey does not exist.
   */
  removeKeypair(pubkey: PublicKey) {
    if (!keypairs.has(pubkey.toBase58())) {
      throw new KeypairNotExistsError(pubkey);
    }
    keypairs.delete(pubkey.toBase58());
  }

  /**
   * Gets a keypair based on the publicKey.
   * @param pubkey The public key of the pair to be retrieved.
   * @returns The corresponding keypair.
   * @throws KeypairNotFoundError if the keypair with the specified publicKey does not exist.
   */
  getKeypair(pubkey: PublicKey): Keypair {
    const keypair = keypairs.get(pubkey.toBase58());
    if (!keypair) {
      throw new KeypairNotFoundError(pubkey);
    }
    return keypair;
  }
}
