import { DummyKeys } from "@staratlas/atlas-prime";
import { DummyKeysRaw } from "../types/types";
import { parsePublicKey } from "./parsePublicKey";

// Funzione per convertire un piano nel tipo corretto
export const parsePrimeData = (primeData: DummyKeysRaw): DummyKeys => {
  return {
    feePayer: parsePublicKey(primeData.feePayer),
    paymentKey: parsePublicKey(primeData.paymentKey),
    tokenVault: parsePublicKey(primeData.tokenVault),
    rates: parsePublicKey(primeData.rates),
  };
};
