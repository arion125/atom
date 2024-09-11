// V1
import { Keypair } from "@solana/web3.js";
import crypto, { randomFillSync } from "crypto";
import { CryptoContent, CryptoResult, EncryptedData } from "../../types/types";

const ALGORITHM = "aes-256-gcm";
const KEY_SIZE = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const DIGEST = "sha256";

const HEX_SALT_LENGTH = SALT_LENGTH * 2;
const HEX_IV_LENGTH = IV_LENGTH * 2;
const HEX_TAG_LENGTH = 16 * 2;
const MIN_SECRET_LENGTH = 32;

function validateCryptoInputs(secret: Buffer, components?: CryptoContent): CryptoResult {
  if (secret.length < MIN_SECRET_LENGTH) {
    return { type: "SecretTooShort" };
  }

  if (components) {
    if (components.salt.length !== HEX_SALT_LENGTH) {
      return { type: "InvalidSaltLength" };
    }
    if (components.iv.length !== HEX_IV_LENGTH) {
      return { type: "InvalidIVLength" };
    }
    if (components.tag.length !== HEX_TAG_LENGTH) {
      return { type: "InvalidTagLength" };
    }
    if (!/^[a-f0-9]+$/i.test(components.content)) {
      return { type: "InvalidContentHex" };
    }
  }

  return { type: "Success" };
}

function secureDelete(buffer: Buffer) {
  randomFillSync(buffer);
  buffer.fill(0);
}

export const encrypt = (keypair: Keypair, secret: Buffer): CryptoResult => {
  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const hash = crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_SIZE, DIGEST);
    const validation = validateCryptoInputs(hash);
    if (validation.type !== "Success") return validation;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, hash, iv);
    randomFillSync(hash);

    let encrypted = cipher.update(Buffer.from(keypair.secretKey));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      type: "Success",
      result: {
        iv: iv.toString("hex"),
        salt: salt.toString("hex"),
        content: encrypted.toString("hex"),
        tag: authTag.toString("hex"),
      },
    };
  } catch (error) {
    console.error("Encryption error:", error);
    return { type: "EncryptionFailed" };
  }
};

export const decrypt = (
  encryptedKeypair: EncryptedData,
  secret: Buffer,
): CryptoResult => {
  try {
    const salt = Buffer.from(encryptedKeypair.salt, "hex");
    const iv = Buffer.from(encryptedKeypair.iv, "hex");
    const encryptedText = Buffer.from(encryptedKeypair.content, "hex");
    const authTag = Buffer.from(encryptedKeypair.tag, "hex");

    const hash = crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_SIZE, DIGEST);
    const validation = validateCryptoInputs(hash);
    if (validation.type !== "Success") return validation;

    const decipher = crypto.createDecipheriv(ALGORITHM, hash, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    secureDelete(salt);
    secureDelete(hash);
    secureDelete(iv);
    secureDelete(encryptedText);
    secureDelete(authTag);

    return { type: "Success", result: decrypted };
  } catch (error) {
    console.error("Decryption error:", error);
    return { type: "DecryptionFailed" };
  }
};

// V3
/* import { Keypair } from "@solana/web3.js";
import sodium from "libsodium-wrappers";
import { EncryptedData, CryptoContent, CryptoResult } from "../../types/types";

const SALT_LENGTH = 16;
const KEY_SIZE = 32;
const NONCE_LENGTH = sodium.crypto_secretbox_NONCEBYTES;
const MIN_SECRET_LENGTH = 32;
const MAX_SECRET_LENGTH = 128;
const MAC_LENGTH = sodium.crypto_auth_BYTES;

function validateCryptoInputs(
  secret: Uint8Array,
  components?: CryptoContent,
): CryptoResult {
  if (secret.length < MIN_SECRET_LENGTH) {
    return { type: "SecretTooShort" };
  }
  if (secret.length > MAX_SECRET_LENGTH) {
    return { type: "SecretTooLong" };
  }

  if (components) {
    if (components.salt.length !== SALT_LENGTH * 2) {
      return { type: "InvalidSaltLength" };
    }
    if (components.nonce.length !== NONCE_LENGTH * 2) {
      return { type: "InvalidNonceLength" };
    }
    if (!/^[a-f0-9]+$/i.test(components.content)) {
      return { type: "InvalidContentHex" };
    }
    if (components.mac.length !== MAC_LENGTH * 2) {
      return { type: "InvalidMAC" };
    }
  }

  return { type: "Success" };
}

function secureZeroMemory(buffer: Uint8Array) {
  sodium.memzero(buffer);
}

export const encrypt = async (
  keypair: Keypair,
  secret: Buffer,
): Promise<CryptoResult> => {
  await sodium.ready;
  let key: Uint8Array | null = null;
  try {
    const salt = sodium.randombytes_buf(SALT_LENGTH);
    key = sodium.crypto_pwhash(
      KEY_SIZE,
      secret,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_DEFAULT,
    );

    if (!key) {
      return { type: "KeyGenerationFailed" };
    }

    const validation = validateCryptoInputs(key);
    if (validation.type !== "Success") return validation;

    const nonce = sodium.randombytes_buf(NONCE_LENGTH);
    const encrypted = sodium.crypto_secretbox_easy(
      keypair.secretKey,
      nonce,
      key,
    );

    const mac = sodium.crypto_auth(encrypted, key);

    return {
      type: "Success",
      result: {
        salt: sodium.to_hex(salt),
        nonce: sodium.to_hex(nonce),
        content: sodium.to_hex(encrypted),
        mac: sodium.to_hex(mac),
      },
    };
  } catch (error) {
    console.error("Encryption error:", (error as Error).message);
    return { type: "EncryptionFailed" };
  } finally {
    if (key) secureZeroMemory(key);
  }
};

export const decrypt = async (
  encryptedKeypair: EncryptedData,
  secret: Buffer,
): Promise<CryptoResult> => {
  await sodium.ready;
  let key: Uint8Array | null = null;
  try {
    const salt = sodium.from_hex(encryptedKeypair.salt);
    const nonce = sodium.from_hex(encryptedKeypair.nonce);
    const encryptedText = sodium.from_hex(encryptedKeypair.content);
    const mac = sodium.from_hex(encryptedKeypair.mac);

    key = sodium.crypto_pwhash(
      KEY_SIZE,
      secret,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_DEFAULT,
    );

    if (!key) {
      return { type: "KeyGenerationFailed" };
    }

    const validation = validateCryptoInputs(key);
    if (validation.type !== "Success") return validation;

    if (!sodium.crypto_auth_verify(mac, encryptedText, key)) {
      return { type: "InvalidMAC" };
    }

    const decrypted = sodium.crypto_secretbox_open_easy(
      encryptedText,
      nonce,
      key,
    );
    if (!decrypted) {
      return { type: "DecryptionFailed" };
    }

    return { type: "Success", result: Buffer.from(decrypted) };
  } catch (error) {
    console.error("Decryption error:", (error as Error).message);
    return { type: "DecryptionFailed" };
  } finally {
    if (key) secureZeroMemory(key);
  }
}; */
