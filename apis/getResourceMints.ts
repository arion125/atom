import { GetResourceMintsError } from '../common/errors';
import { ApiResponse, ResourceMintsRaw, ResourceMints } from '../types/types';
import axios, { AxiosResponse } from 'axios';
import { parseResourceMints } from '../utils/parseResourceMints';

// GET - per scaricare i mint di tutte le risorse
export const getResourceMints = async (): Promise<ResourceMints> => {
  try {
    const response: AxiosResponse<ApiResponse<ResourceMintsRaw>> =
      await axios.get<ApiResponse<ResourceMintsRaw>>(
        'https://n8n.staratlasitalia.com/webhook/getResourceMints',
      );
    if (response.data.code !== 200)
      throw new GetResourceMintsError(response.data.error);
    return parseResourceMints(response.data.data);
  } catch (error) {
    throw new GetResourceMintsError(`${error}`);
  }
};
