import { Keypair, PublicKey } from "@solana/web3.js";

/**
 * Checks the validity of a private key and returns a keypair..
 *
 * @param privateKey - The private key as a Uint8Array.
 * @returns An object with the type and result of the keypair retrieval.
 *          - If the keypair is not on the curve, the type will be "KeypairIsNotOnCurve".
 *          - If the keypair retrieval is successful, the type will be "Success" and the result will be the keypair.
 */
export const getKeypair = (privateKey: Uint8Array) => {
  const keypair = Keypair.fromSecretKey(privateKey);

  if (!PublicKey.isOnCurve(keypair.publicKey.toBytes()))
    return { type: "KeypairIsNotOnCurve" as const };

  return { type: "Success" as const, result: keypair };
};
