import { PublicKey, Connection } from "@solana/web3.js";
import { getParsedTokenAccountsByOwner } from "@staratlas/data-source";
import { ResultAsync } from "neverthrow";
import { createError } from "./createError";

export const getTokenAccountsByOwner = (connection: Connection, owner: PublicKey) => {
  const accounts = ResultAsync.fromPromise(
    getParsedTokenAccountsByOwner(connection, owner),
    createError("FailedToGetTokenAccountsByOwner"),
  );
  return accounts;
};
