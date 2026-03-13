import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { getLatestToken, saveToken } from '../db/queries';

let cachedToken: { token: string; expiresAt: Date } | null = null;

/**
 * Получить валидный access_token Авито.
 * Автоматически обновляет, если до истечения < 1 часа.
 */
export async function getAccessToken(): Promise<string> {
    // Проверяем кэш в памяти
    if (cachedToken && cachedToken.expiresAt.getTime() - Date.now() > 3600 * 1000) {
        return cachedToken.token;
    }

    // Проверяем БД
    const dbToken = await getLatestToken();
    if (dbToken && new Date(dbToken.expires_at).getTime() - Date.now() > 3600 * 1000) {
        cachedToken = { token: dbToken.access_token, expiresAt: new Date(dbToken.expires_at) };
        return cachedToken.token;
    }

    // Получаем новый токен
    return refreshToken();
}

async function refreshToken(): Promise<string> {
    console.log('[Avito Auth] Refreshing token...');

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', config.avito.clientId);
    params.append('client_secret', config.avito.clientSecret);

    const resp = await axios.post(config.avito.tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, expires_in } = resp.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await saveToken(access_token, expiresAt);
    cachedToken = { token: access_token, expiresAt };

    console.log(`[Avito Auth] Token refreshed, expires at ${expiresAt.toISOString()}`);
    return access_token;
}

/**
 * Axios-клиент с автоматической авторизацией Авито.
 */
export function createAvitoClient(): AxiosInstance {
    const client = axios.create({
        baseURL: config.avito.baseUrl,
        timeout: 10000,
    });

    client.interceptors.request.use(async (cfg) => {
        const token = await getAccessToken();
        cfg.headers.Authorization = `Bearer ${token}`;
        return cfg;
    });

    client.interceptors.response.use(
        (res) => res,
        async (err) => {
            // Если 401 — пробуем обновить токен и повторить
            if (err.response?.status === 401 && !err.config._retry) {
                err.config._retry = true;
                cachedToken = null;
                const token = await refreshToken();
                err.config.headers.Authorization = `Bearer ${token}`;
                return axios(err.config);
            }
            throw err;
        }
    );

    return client;
}
