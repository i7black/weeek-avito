import { config } from '../config';
import { createTask } from '../weeek/client';
import { findTaskByChatId, saveChatTaskMap, logWebhook, markWebhookProcessed } from '../db/queries';

/**
 * Webhook payload от Авито (упрощённая структура).
 * Реальный payload может отличаться — нужно адаптировать после первого живого вебхука.
 */
export interface AvitoWebhookPayload {
    /** ID чата */
    chat_id?: string;
    /** ID пользователя-отправителя */
    author_id?: number;
    /** Текст сообщения */
    text?: string;
    /** Тип (text, image, voice, etc) */
    type?: string;
    /** ID объявления */
    item_id?: string | number;
    /** Имя покупателя */
    user_name?: string;
    /** Название объявления */
    item_title?: string;
    /** Весь payload как есть */
    [key: string]: any;
}

/**
 * Обработать входящее сообщение из Авито → создать/обновить задачу в Weeek.
 */
export async function handleIncomingMessage(payload: AvitoWebhookPayload): Promise<void> {
    const webhookId = await logWebhook(payload);

    try {
        const chatId = payload.chat_id;
        if (!chatId) {
            console.warn('[Bridge] Webhook без chat_id, пропускаем:', JSON.stringify(payload).slice(0, 200));
            await markWebhookProcessed(webhookId, 'no chat_id');
            return;
        }

        // Проверяем: не наше ли это сообщение (исходящее)
        const avitoUserId = parseInt(config.avito.userId);
        if (payload.author_id === avitoUserId) {
            console.log('[Bridge] Исходящее сообщение, пропускаем');
            await markWebhookProcessed(webhookId);
            return;
        }

        const messageText = payload.text || '(медиа-сообщение)';
        const buyerName = payload.user_name || `Покупатель #${payload.author_id}`;
        const itemTitle = payload.item_title || `Объявление #${payload.item_id || 'N/A'}`;
        const itemId = String(payload.item_id || '');

        // Проверяем — существует ли уже задача для этого чата
        const existing = await findTaskByChatId(chatId);

        if (existing) {
            // Задача уже есть → добавляем информацию (обновляем)
            console.log(`[Bridge] Обновление задачи ${existing.weeek_task_id} для чата ${chatId}`);

            // К сожалению, Weeek API не имеет PUT /tm/tasks/{id} для обновления описания.
            // Создаём подзадачу с новым сообщением:
            const now = new Date();
            const day = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;
            const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

            await createTask({
                title: `💬 ${buyerName}: ${messageText.slice(0, 80)}`,
                type: 'action',
                priority: 1,
                description: `**Сообщение от ${buyerName}** (${timeStr})\n\n${messageText}\n\n---\nЧат: ${chatId}\nОбъявление: ${itemTitle}`,
                day,
                projectId: config.weeek.projectId,
                boardId: config.weeek.boardId,
                boardColumnId: config.weeek.boardColumnId,
            });

            console.log(`[Bridge] Подзадача создана для чата ${chatId}`);
        } else {
            // Новый чат → создаём задачу
            const now = new Date();
            const day = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`;

            const task = await createTask({
                title: `[Авито] ${buyerName} — ${itemTitle}`,
                type: 'action',
                priority: 2, // High
                description: `**Новый диалог из Авито**\n\n` +
                    `👤 Покупатель: ${buyerName}\n` +
                    `📦 Объявление: ${itemTitle}\n` +
                    `💬 Первое сообщение: ${messageText}\n\n` +
                    `---\n` +
                    `Чат ID: ${chatId}\n` +
                    `Item ID: ${itemId}`,
                day,
                projectId: config.weeek.projectId,
                boardId: config.weeek.boardId,
                boardColumnId: config.weeek.boardColumnId,
            });

            await saveChatTaskMap({
                avitoChatId: chatId,
                avitoUserId: config.avito.userId,
                weeekTaskId: task.id,
                itemId,
                buyerName,
            });

            console.log(`[Bridge] Создана задача ${task.id} для чата ${chatId}`);
        }

        await markWebhookProcessed(webhookId);
    } catch (err: any) {
        console.error('[Bridge] Ошибка обработки сообщения:', err.message);
        await markWebhookProcessed(webhookId, err.message);
        throw err;
    }
}
