import { GetPlanError } from "../common/errors";
import { ApiResponse, Base64Script, GetPlanParams } from "../types/types";
import axios, { AxiosResponse } from "axios";

// GET - per scaricare il codice base64 del piano dal db
export const getPlan = async (data: GetPlanParams): Promise<Base64Script> => {
  try {
    const response: AxiosResponse<ApiResponse<Base64Script>> = await axios.get<
      ApiResponse<Base64Script>
    >(
      `https://n8n.staratlasitalia.com/webhook/getPlan?pubkey=${data.pubkey}&planName=${data.planName}`,
    );
    if (response.data.code !== 200) throw new GetPlanError(response.data.error);
    return response.data.data;
  } catch (error) {
    throw new GetPlanError(`${error}`);
  }
};
