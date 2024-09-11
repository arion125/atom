import { Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs-extra";
import { EncryptedData } from "../../types/types";
import { decrypt } from "./crypto";
import { keypairPath } from "../../common/constants";

export const decryptKeypair = (secret: Buffer, pubkey: PublicKey) => {
  const path = keypairPath(pubkey);

  try {
    const fileContent = readFileSync(path).toString();
    const encryptedKeypair = JSON.parse(fileContent) as EncryptedData;

    if (
      !encryptedKeypair.iv ||
      !encryptedKeypair.content ||
      !encryptedKeypair.salt ||
      !encryptedKeypair.tag
    ) {
      return {
        type: "EncryptedKeypairParsingError" as const,
      };
    }

    const decryptedKeypair = decrypt(encryptedKeypair, secret);

    if (decryptedKeypair.type !== "Success") {
      return decryptedKeypair;
    }

    if (!(decryptedKeypair.result instanceof Buffer))
      return { type: "DecryptionFailed" as const };

    const keypair = Keypair.fromSecretKey(Uint8Array.from(decryptedKeypair.result));

    if (!PublicKey.isOnCurve(keypair.publicKey.toBytes())) {
      return { type: "KeypairIsNotOnCurve" as const };
    }

    return { type: "Success" as const, result: keypair };
  } catch (e) {
    return { type: "DecryptKeypairError" as const };
  }
};
