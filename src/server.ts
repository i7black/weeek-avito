import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { config } from './config';
import { initDb, getAllChats, getRecentReplies, findTaskByChatId } from './db/queries';
import { handleIncomingMessage } from './bridge/messages';
import { sendReplyToAvito } from './bridge/replies';
import { startCallsPoller } from './bridge/calls';
import { subscribeWebhook, getChats, getChatMessages } from './avito/messenger';

const app = Fastify({ logger: true });

async function start() {
    // CORS
    await app.register(cors, { origin: true });

    // Статика для веб-панели
    await app.register(fastifyStatic, {
        root: path.join(__dirname, '..', 'public'),
        prefix: '/',
    });

    // ─── Webhook Авито ───
    app.post(config.server.webhookPath, async (req, reply) => {
        const payload = req.body as any;
        console.log('[Webhook] Получен webhook:', JSON.stringify(payload).slice(0, 300));

        // Отвечаем 200 мгновенно (Авито требует < 2 сек)
        reply.code(200).send({ ok: true });

        // Обработка в фоне (не блокируем ответ)
        setImmediate(async () => {
            try {
                await handleIncomingMessage(payload);
            } catch (err: any) {
                console.error('[Webhook] Ошибка фоновой обработки:', err.message);
            }
        });
    });

    // ─── API: список чатов для веб-панели ───
    app.get('/api/chats', async (req, reply) => {
        const chats = await getAllChats();
        return { chats };
    });

    // ─── API: сообщения конкретного чата (из Авито) ───
    app.get<{ Params: { chatId: string } }>('/api/chats/:chatId/messages', async (req, reply) => {
        const { chatId } = req.params;
        try {
            const [avitoMessages, ourReplies] = await Promise.all([
                getChatMessages(chatId, { limit: 50 }),
                getRecentReplies(chatId, 50),
            ]);
            return {
                avito: avitoMessages.messages || [],
                replies: ourReplies,
            };
        } catch (err: any) {
            console.error('[API] Ошибка получения сообщений:', err.message);
            return reply.code(500).send({ error: err.message });
        }
    });

    // ─── API: отправить ответ ───
    app.post<{
        Params: { chatId: string };
        Body: { text: string; senderName?: string };
    }>('/api/chats/:chatId/reply', async (req, reply) => {
        const { chatId } = req.params;
        const { text, senderName } = req.body as any;

        if (!text || !text.trim()) {
            return reply.code(400).send({ error: 'Текст ответа не может быть пустым' });
        }

        try {
            await sendReplyToAvito(chatId, text.trim(), senderName);
            return { ok: true, message: 'Ответ отправлен' };
        } catch (err: any) {
            console.error('[API] Ошибка отправки ответа:', err.message);
            return reply.code(500).send({ error: err.message });
        }
    });

    // ─── API: регистрация webhook в Авито ───
    app.post<{ Body: { url: string } }>('/api/setup/webhook', async (req, reply) => {
        const { url } = req.body as any;
        if (!url) {
            return reply.code(400).send({ error: 'URL обязателен' });
        }
        try {
            const result = await subscribeWebhook(url);
            return { ok: true, result };
        } catch (err: any) {
            return reply.code(500).send({ error: err.message });
        }
    });

    // ─── API: health check ───
    app.get('/api/health', async () => {
        return {
            status: 'ok',
            uptime: process.uptime(),
            avito: config.avito.isConfigured ? 'connected' : 'NOT CONFIGURED — add AVITO_CLIENT_ID, AVITO_CLIENT_SECRET, AVITO_USER_ID',
            weeek: 'connected',
        };
    });

    // ─── Инициализация ───
    await initDb();
    console.log('[Server] БД инициализирована');

    // Запускаем поллер звонков только если Авито настроен
    if (config.avito.isConfigured) {
        startCallsPoller();
        console.log('[Server] Avito подключен, поллер звонков запущен');
    } else {
        console.warn('[Server] Avito НЕ настроен — webhook и поллер звонков отключены');
        console.warn('[Server] Добавьте AVITO_CLIENT_ID, AVITO_CLIENT_SECRET, AVITO_USER_ID в переменные окружения');
    }

    // Старт сервера
    await app.listen({ port: config.server.port, host: config.server.host });
    console.log(`[Server] Запущен на http://${config.server.host}:${config.server.port}`);
}

start().catch((err) => {
    console.error('[Server] Критическая ошибка:', err);
    process.exit(1);
});
