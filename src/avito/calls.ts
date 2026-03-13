import { createAvitoClient } from './auth';
import { AxiosInstance } from 'axios';

let client: AxiosInstance;

function getClient(): AxiosInstance {
    if (!client) client = createAvitoClient();
    return client;
}

export interface AvitoCall {
    callId: string;
    callTime: string;
    buyerPhone: string;
    sellerPhone: string;
    virtualPhone: string;
    itemId: string | number;
    talkDuration: number;
}

/**
 * Получить список звонков за период.
 * dateTimeFrom и dateTimeTo в формате RFC3339.
 */
export async function getCalls(params: {
    dateTimeFrom: string;
    dateTimeTo?: string;
    limit?: number;
    offset?: number;
}): Promise<{ calls: AvitoCall[] }> {
    const c = getClient();
    const resp = await c.post('/calltracking/v1/getCalls/', {
        dateTimeFrom: params.dateTimeFrom,
        dateTimeTo: params.dateTimeTo,
        limit: params.limit || 100,
        offset: params.offset || 0,
    });
    return resp.data;
}
