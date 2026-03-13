import { AxiosInstance } from 'axios';
import { createAvitoClient } from './auth';
import { config } from '../config';

let client: AxiosInstance;

function getClient(): AxiosInstance {
    if (!client) client = createAvitoClient();
    return client;
}

const userId = () => config.avito.userId;

// ─── Чаты ───

export interface AvitoChat {
    id: string;
    context: {
        type: string;
        value: {
            id?: number;
            title?: string;
            price?: number;
            url?: string;
            image_url?: string;
        };
    };
    users: Array<{
        id: number;
        name: string;
        public_user_profile?: { url: string };
    }>;
    last_message?: AvitoMessage;
    created: number;
    updated: number;
    unread_count?: number;
}

export interface AvitoMessage {
    id: string;
    author_id: number;
    chat_id?: string;
    content: {
        text?: string;
        type?: string;
    };
    created: number;
    type: string;
    direction?: string;
    isRead?: boolean;
}

/**
 * Получить список чатов.
 */
export async function getChats(params?: {
    unread_only?: boolean;
    chat_type?: 'u2i' | 'u2u';
    limit?: number;
    offset?: number;
}): Promise<{ chats: AvitoChat[] }> {
    const c = getClient();
    const resp = await c.get(`/messenger/v1/accounts/${userId()}/chats`, { params });
    return resp.data;
}

/**
 * Получить информацию о конкретном чате.
 */
export async function getChat(chatId: string): Promise<AvitoChat> {
    const c = getClient();
    const resp = await c.get(`/messenger/v1/accounts/${userId()}/chats/${chatId}`);
    return resp.data;
}

/**
 * Получить сообщения чата (v3).
 */
export async function getChatMessages(chatId: string, params?: {
    limit?: number;
    offset?: number;
}): Promise<{ messages: AvitoMessage[] }> {
    const c = getClient();
    const resp = await c.get(
        `/messenger/v3/accounts/${userId()}/chats/${chatId}/messages/`,
        { params: { limit: params?.limit || 50, offset: params?.offset || 0 } }
    );
    return resp.data;
}

/**
 * Отправить текстовое сообщение.
 */
export async function sendMessage(chatId: string, text: string): Promise<any> {
    const c = getClient();
    const resp = await c.post(
        `/messenger/v1/accounts/${userId()}/chats/${chatId}/messages`,
        { type: 'text', text }
    );
    return resp.data;
}

/**
 * Пометить чат прочитанным.
 */
export async function markChatRead(chatId: string): Promise<void> {
    const c = getClient();
    await c.post(`/messenger/v1/accounts/${userId()}/chats/${chatId}/read`);
}

// ─── Webhook ───

/**
 * Подписаться на webhook V3.
 */
export async function subscribeWebhook(url: string): Promise<any> {
    const c = getClient();
    const resp = await c.post('/messenger/v3/webhook', { url });
    return resp.data;
}

/**
 * Получить список подписок.
 */
export async function getWebhookSubscriptions(): Promise<any> {
    const c = getClient();
    const resp = await c.get(`/messenger/v1/accounts/${userId()}/webhooks`);
    return resp.data;
}
