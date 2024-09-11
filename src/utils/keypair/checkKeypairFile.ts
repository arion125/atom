import { keypairPath } from "../../common/constants";
import { existsSync, readFileSync } from "fs-extra";
import { EncryptedData } from "../../types/types";
import { PublicKey } from "@solana/web3.js";

export const checkKeypairFile = (pubkey: PublicKey) => {
  const path = keypairPath(pubkey);

  if (!existsSync(path)) return { type: "KeypairFileNotFound" as const };
  const fileContent = readFileSync(path).toString();
  const encryptedKeypair = JSON.parse(fileContent) as EncryptedData;

  if (
    encryptedKeypair.iv &&
    encryptedKeypair.content &&
    encryptedKeypair.salt &&
    encryptedKeypair.tag
  )
    return { type: "Success" as const };

  return { type: "KeypairFileParsingError" as const, path };
};
