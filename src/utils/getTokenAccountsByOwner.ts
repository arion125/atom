import { PublicKey, Connection } from "@solana/web3.js";
import { getParsedTokenAccountsByOwner } from "@staratlas/data-source";

export const getTokenAccountsByOwner = async (
  connection: Connection,
  owner: PublicKey,
) => {
  try {
    const accounts = await getParsedTokenAccountsByOwner(connection, owner);
    return accounts;
  } catch (e) {
    throw e;
  }
};
