import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import fs from 'fs';
import path from 'path';

let pool: Pool;

export function getPool(): Pool {
    if (!pool) {
        pool = new Pool({ connectionString: config.database.url });
    }
    return pool;
}

export async function initDb(): Promise<void> {
    const p = getPool();
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await p.query(schema);
    console.log('[DB] Schema initialized');
}

// ─── Chat ↔ Task Mapping ───

export async function findTaskByChatId(chatId: string): Promise<{ weeek_task_id: number; avito_user_id: string } | null> {
    const p = getPool();
    const res = await p.query(
        'SELECT weeek_task_id, avito_user_id FROM chat_task_map WHERE avito_chat_id = $1',
        [chatId]
    );
    return res.rows[0] || null;
}

export async function saveChatTaskMap(data: {
    avitoChatId: string;
    avitoUserId: string;
    weeekTaskId: number;
    itemId?: string;
    buyerName?: string;
}): Promise<void> {
    const p = getPool();
    await p.query(
        `INSERT INTO chat_task_map (avito_chat_id, avito_user_id, weeek_task_id, item_id, buyer_name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (avito_chat_id) DO UPDATE SET
       weeek_task_id = $3, updated_at = NOW()`,
        [data.avitoChatId, data.avitoUserId, data.weeekTaskId, data.itemId || null, data.buyerName || null]
    );
}

// ─── Processed Calls ───

export async function isCallProcessed(callId: string): Promise<boolean> {
    const p = getPool();
    const res = await p.query('SELECT 1 FROM processed_calls WHERE call_id = $1', [callId]);
    return res.rowCount !== null && res.rowCount > 0;
}

export async function saveProcessedCall(data: {
    callId: string;
    callTime: string;
    itemId?: string;
    buyerPhone?: string;
    sellerPhone?: string;
    talkDuration?: number;
    weeekTaskId?: number;
}): Promise<void> {
    const p = getPool();
    await p.query(
        `INSERT INTO processed_calls (call_id, call_time, item_id, buyer_phone, seller_phone, talk_duration, weeek_task_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (call_id) DO NOTHING`,
        [data.callId, data.callTime, data.itemId || null, data.buyerPhone || null, data.sellerPhone || null, data.talkDuration || 0, data.weeekTaskId || null]
    );
}

// ─── Avito Token ───

export async function getLatestToken(): Promise<{ access_token: string; expires_at: Date } | null> {
    const p = getPool();
    const res = await p.query(
        'SELECT access_token, expires_at FROM avito_tokens ORDER BY created_at DESC LIMIT 1'
    );
    return res.rows[0] || null;
}

export async function saveToken(accessToken: string, expiresAt: Date): Promise<void> {
    const p = getPool();
    await p.query(
        'INSERT INTO avito_tokens (access_token, expires_at) VALUES ($1, $2)',
        [accessToken, expiresAt]
    );
}

// ─── Sent Replies ───

export async function saveReply(chatId: string, text: string, sentBy?: string): Promise<void> {
    const p = getPool();
    await p.query(
        'INSERT INTO sent_replies (avito_chat_id, message_text, sent_by) VALUES ($1, $2, $3)',
        [chatId, text, sentBy || null]
    );
}

// ─── Webhook Log ───

export async function logWebhook(payload: any): Promise<number> {
    const p = getPool();
    const res = await p.query(
        'INSERT INTO webhook_log (payload) VALUES ($1) RETURNING id',
        [JSON.stringify(payload)]
    );
    return res.rows[0].id;
}

export async function markWebhookProcessed(id: number, error?: string): Promise<void> {
    const p = getPool();
    await p.query(
        'UPDATE webhook_log SET processed = TRUE, error = $2 WHERE id = $1',
        [id, error || null]
    );
}

// ─── All chats (for web UI) ───

export async function getAllChats(): Promise<Array<{
    id: number;
    avito_chat_id: string;
    avito_user_id: string;
    weeek_task_id: number;
    item_id: string | null;
    buyer_name: string | null;
    created_at: Date;
    updated_at: Date;
}>> {
    const p = getPool();
    const res = await p.query('SELECT * FROM chat_task_map ORDER BY updated_at DESC LIMIT 100');
    return res.rows;
}

export async function getRecentReplies(chatId: string, limit = 20): Promise<Array<{
    message_text: string;
    sent_by: string | null;
    sent_at: Date;
}>> {
    const p = getPool();
    const res = await p.query(
        'SELECT message_text, sent_by, sent_at FROM sent_replies WHERE avito_chat_id = $1 ORDER BY sent_at DESC LIMIT $2',
        [chatId, limit]
    );
    return res.rows;
}
