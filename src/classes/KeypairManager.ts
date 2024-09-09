// src/KeypairManager.ts

import { Keypair, PublicKey } from '@solana/web3.js';
import {
  KeypairAlreadyExistsError,
  KeypairNotExistsError,
  KeypairNotFoundError,
} from '../../common/errors';

export class KeypairManager {
  private keypairs: Map<string, Keypair>;

  constructor() {
    this.keypairs = new Map();
  }

  /**
   * Adds a new keypair to the manager.
   * @param keypair The keypair to be added.
   * @throws KeypairAlreadyExistsError if a keypair with the same publicKey already exists.
   */
  public addKeypair(keypair: Keypair): void {
    if (this.keypairs.has(keypair.publicKey.toBase58())) {
      throw new KeypairAlreadyExistsError(keypair.publicKey);
    }
    this.keypairs.set(keypair.publicKey.toBase58(), keypair);
  }

  /**
   * Removes a keypair based on the publicKey.
   * @param pubkey The public key of the pair to be removed.
   * @throws KeypairNotExistsError if the keypair with the specified publicKey does not exist.
   */
  public removeKeypair(pubkey: PublicKey): void {
    if (!this.keypairs.has(pubkey.toBase58())) {
      throw new KeypairNotExistsError(pubkey);
    }
    this.keypairs.delete(pubkey.toBase58());
  }

  /**
   * Gets a keypair based on the publicKey.
   * @param pubkey The public key of the pair to be retrieved.
   * @returns The corresponding keypair.
   * @throws KeypairNotFoundError if the keypair with the specified publicKey does not exist.
   */
  public getKeypair(pubkey: PublicKey): Keypair {
    const keypair = this.keypairs.get(pubkey.toBase58());
    if (!keypair) {
      throw new KeypairNotFoundError(pubkey);
    }
    return keypair;
  }
}
