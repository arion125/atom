import { GetPrimeDataError } from "../common/errors";
import { DummyKeysRaw } from "../types/types";
import axios, { AxiosResponse } from "axios";
import { DummyKeys } from "@staratlas/atlas-prime";
import { parsePrimeData } from "../utils/parsePrimeData";

// GET - per scaricare le public key di Atlas prime
export const getPrimeData = async (): Promise<DummyKeys> => {
  try {
    const response: AxiosResponse<DummyKeysRaw> = await axios.get<DummyKeysRaw>(
      "https://prime.staratlas.com/",
    );
    if (!response.data) throw new GetPrimeDataError("Errore nel recupero dei dati");
    return parsePrimeData(response.data);
  } catch (error) {
    throw new GetPrimeDataError(`${error}`);
  }
};
