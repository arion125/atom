import { CreateLogError } from "../common/errors";
import { CreateLogPayload, DefaultApiResponse } from "../types/types";
import axios, { AxiosResponse } from "axios";

// POST - per creare un log su supabase
export const createLog = async (
  data: CreateLogPayload,
): Promise<DefaultApiResponse> => {
  try {
    const response: AxiosResponse<DefaultApiResponse> =
      await axios.post<DefaultApiResponse>(
        "https://n8n.staratlasitalia.com/webhook/logAction",
        data,
      );
    return response.data;
  } catch (error) {
    throw new CreateLogError(`${error}`);
  }
};
