import { GetMainDataError } from "../common/errors";
import { ApiResponse, MainData, MainDataRaw } from "../types/types";
import axios, { AxiosResponse } from "axios";
import { parseMainData } from "../utils/parseMainData";

// GET - per scaricare le public key di Game, Programs e Tokens
export const getMainData = async (): Promise<MainData> => {
  try {
    const response: AxiosResponse<ApiResponse<MainDataRaw>> = await axios.get<
      ApiResponse<MainDataRaw>
    >("https://n8n.staratlasitalia.com/webhook/getMainData");
    if (response.data.code !== 200)
      throw new GetMainDataError(response.data.error);
    return parseMainData(response.data.data);
  } catch (error) {
    throw new GetMainDataError(`${error}`);
  }
};
