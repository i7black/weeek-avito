import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required env variable: ${key}`);
    }
    return value;
}

function optional(key: string, fallback: string): string {
    return process.env[key] || fallback;
}

function warnIfMissing(key: string): string {
    const value = process.env[key];
    if (!value) {
        console.warn(`[Config] WARNING: ${key} not set. Avito integration will be disabled.`);
        return '';
    }
    return value;
}

const avitoClientId = warnIfMissing('AVITO_CLIENT_ID');
const avitoClientSecret = warnIfMissing('AVITO_CLIENT_SECRET');
const avitoUserId = warnIfMissing('AVITO_USER_ID');

export const config = {
    // Авито (опционально — сервис запустится без них)
    avito: {
        clientId: avitoClientId,
        clientSecret: avitoClientSecret,
        userId: avitoUserId,
        tokenUrl: 'https://api.avito.ru/token',
        baseUrl: 'https://api.avito.ru',
        isConfigured: Boolean(avitoClientId && avitoClientSecret && avitoUserId),
    },

    // Weeek
    weeek: {
        apiToken: required('WEEEK_API_TOKEN'),
        baseUrl: 'https://api.weeek.net/public/v1',
        projectId: process.env.WEEEK_PROJECT_ID ? parseInt(process.env.WEEEK_PROJECT_ID) : null,
        boardId: process.env.WEEEK_BOARD_ID ? parseInt(process.env.WEEEK_BOARD_ID) : null,
        boardColumnId: process.env.WEEEK_BOARD_COLUMN_ID ? parseInt(process.env.WEEEK_BOARD_COLUMN_ID) : null,
    },

    // Сервер
    server: {
        port: parseInt(optional('PORT', '3000')),
        host: optional('HOST', '0.0.0.0'),
        webhookPath: optional('WEBHOOK_PATH', '/webhook/avito'),
    },

    // БД
    database: {
        url: required('DATABASE_URL'),
    },

    // Polling
    polling: {
        callsIntervalMs: parseInt(optional('CALLS_POLL_INTERVAL_MS', '300000')),
    },
} as const;

