import { PublicKey } from "@solana/web3.js";
import { keypairPath } from "../../common/constants";
import { existsSync, removeSync } from "fs-extra";

export const removeKeypair = (pubkey: PublicKey) => {
  const path = keypairPath(pubkey);

  if (!existsSync(path)) return { type: "KeypairFileNotFound" as const };

  removeSync(path);

  console.log("Keypair removed successfully");
};
