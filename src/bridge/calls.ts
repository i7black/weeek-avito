import { config } from '../config';
import { getCalls, AvitoCall } from '../avito/calls';
import { createTask } from '../weeek/client';
import { isCallProcessed, saveProcessedCall } from '../db/queries';

/**
 * Периодический опрос CallTracking API Авито.
 * Создаёт задачи в Weeek для новых звонков.
 */
export async function pollCalls(): Promise<number> {
    const now = new Date();
    // Запрашиваем звонки за последний интервал + запас
    const from = new Date(now.getTime() - config.polling.callsIntervalMs * 2);

    try {
        console.log(`[Calls Poller] Запрос звонков с ${from.toISOString()}`);

        const resp = await getCalls({
            dateTimeFrom: from.toISOString(),
            dateTimeTo: now.toISOString(),
            limit: 100,
            offset: 0,
        });

        const calls = resp.calls || [];
        let newCount = 0;

        for (const call of calls) {
            const alreadyProcessed = await isCallProcessed(call.callId);
            if (alreadyProcessed) continue;

            // Создаём задачу в Weeek
            const day = new Date(call.callTime);
            const dayStr = `${day.getDate().toString().padStart(2, '0')}.${(day.getMonth() + 1).toString().padStart(2, '0')}.${day.getFullYear()}`;
            const timeStr = day.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

            const durationMin = Math.round(call.talkDuration / 60);

            const task = await createTask({
                title: `📞 [Авито Звонок] ${call.buyerPhone} — #${call.itemId}`,
                type: 'call',
                priority: 2,
                description:
                    `**Входящий звонок из Авито**\n\n` +
                    `📞 Покупатель: ${call.buyerPhone}\n` +
                    `📱 Виртуальный номер: ${call.virtualPhone}\n` +
                    `🏷️ Объявление: #${call.itemId}\n` +
                    `🕐 Время: ${timeStr}\n` +
                    `⏱️ Длительность: ${durationMin} мин\n\n` +
                    `---\n` +
                    `Call ID: ${call.callId}`,
                day: dayStr,
                projectId: config.weeek.projectId,
                boardId: config.weeek.boardId,
                boardColumnId: config.weeek.boardColumnId,
            });

            await saveProcessedCall({
                callId: call.callId,
                callTime: call.callTime,
                itemId: String(call.itemId),
                buyerPhone: call.buyerPhone,
                sellerPhone: call.sellerPhone,
                talkDuration: call.talkDuration,
                weeekTaskId: task.id,
            });

            newCount++;
            console.log(`[Calls Poller] Новый звонок ${call.callId} → задача ${task.id}`);
        }

        console.log(`[Calls Poller] Обработано: ${newCount} новых из ${calls.length} всего`);
        return newCount;
    } catch (err: any) {
        console.error('[Calls Poller] Ошибка:', err.message);
        return 0;
    }
}

/**
 * Запустить периодический опрос.
 */
export function startCallsPoller(): void {
    const interval = config.polling.callsIntervalMs;
    console.log(`[Calls Poller] Запуск с интервалом ${interval / 1000} сек`);

    // Первый запрос сразу
    pollCalls();

    // Затем по расписанию
    setInterval(pollCalls, interval);
}
