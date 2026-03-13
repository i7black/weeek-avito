import { sendMessage } from '../avito/messenger';
import { saveReply } from '../db/queries';

/**
 * Отправить ответ покупателю в Авито и записать в лог.
 */
export async function sendReplyToAvito(chatId: string, text: string, senderName?: string): Promise<void> {
    console.log(`[Reply] Отправка ответа в чат ${chatId}: "${text.slice(0, 50)}..."`);

    // Отправляем через Avito Messenger API
    await sendMessage(chatId, text);

    // Сохраняем в лог
    await saveReply(chatId, text, senderName);

    console.log(`[Reply] Ответ отправлен успешно`);
}
