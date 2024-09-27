/*
export class CustomError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CustomError';
    }
}
*/

import { PublicKey } from "@solana/web3.js";

export class Base64ToJsonError extends Error {
  constructor() {
    super("Invalid plan code");
    this.name = "Base64ToJsonError";
  }
}

export class CreateLogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateLogError";
  }
}

export class GetMainDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GetMainDataError";
  }
}

export class GetResourceMintsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GetResourceMintsError";
  }
}

export class GetPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GetPlanError";
  }
}

export class KeypairAlreadyExistsError extends Error {
  constructor(pubkey: PublicKey) {
    super(`Keypair with publicKey ${pubkey} already exists.`);
    this.name = "KeypairAlreadyExistsError";
  }
}

export class KeypairNotExistsError extends Error {
  constructor(pubkey: PublicKey) {
    super(`Keypair with publicKey ${pubkey} not exists.`);
    this.name = "KeypairNotExistsError";
  }
}

export class KeypairNotFoundError extends Error {
  constructor(pubkey: PublicKey) {
    super(`Keypair with publicKey ${pubkey} not found.`);
    this.name = "KeypairNotFoundError";
  }
}

export class QueueAlreadyExistsError extends Error {
  constructor(planName: string) {
    super(`A plan with the name '${planName}' already exists.`);
    this.name = "QueueAlreadyExistsError";
  }
}

export class QueueNotFoundError extends Error {
  constructor(planName: string) {
    super(`No plan found with the name '${planName}'.`);
    this.name = "QueueNotFoundError";
  }
}

export class NoQueuesToProcessError extends Error {
  constructor() {
    super("No plans to process.");
    this.name = "NoQueuesToProcessError";
  }
}

export class InvalidPublicKeyError extends Error {
  constructor(pubkey: string) {
    super(`Invalid public key ${pubkey}`);
    this.name = "InvalidPublicKeyError";
  }
}

export class GetPrimeDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GetPrimeDataError";
  }
}
