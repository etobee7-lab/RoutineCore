/**
 * RoutineCore Notification Service
 * 대규모 트래픽 대응 및 멀티 채널 알림 처리를 담당합니다.
 * (Supported: WebPush, Allen-Steel Concerts Notifications)
 */
const webpush = require('web-push');

class NotificationService {
    constructor() {
        // 기존 VAPID 키 설정 (server.cjs에서 이전 예정)
        this.vapidKeys = {
            publicKey: 'BHQBElHGuk1fdr1WwVk0fcc2KbUBVS9L-tRysmha6cLuUGLFUF3g7SoINdxeWDzhcyCgOOLdyG7iRj2WcZO9Qew',
            privateKey: 'HjuKvvBD78CvbofcQ4GhkbL_XDaZrsz1YPQvZ5cFe-g'
        };
        webpush.setVapidDetails('mailto:support@example.com', this.vapidKeys.publicKey, this.vapidKeys.privateKey);
    }

    /**
     * allen-steel-concerts-notifications 시스템 연동 어댑터
     * 대규모 트래픽 시 지연 없는 송출을 위한 비동기 처리
     */
    async sendToAllenSteel(payload) {
        // [TODO] 실제 allen-steel-concerts-notifications API 엔드포인트 연동
        // 현재는 대규모 부하 분산을 가정한 로직만 구현
        console.log(`[ALLEN-STEEL-SYSTEM] Sending notification: ${payload.title}`);
        
        // Mocking async call to external service
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true, provider: 'AllenSteel' });
            }, 50); // 수만 건 발송 시 지연을 줄이기 위해 빠른 비동기 응답 지향
        });
    }

    /**
     * 멀티 채널 브로드캐스트
     * 대규모 트래픽 발생 시 병렬 처리를 통해 지연을 최소화합니다.
     */
    async broadcast(subscriptions, payload) {
        const tasks = [];

        // 1. 기존 WebPush 발송 태스크 구성
        const webPushTasks = subscriptions.map(subRow => {
            const subscription = JSON.parse(subRow.subscription);
            return webpush.sendNotification(subscription, JSON.stringify(payload))
                .catch(err => {
                    if (err.statusCode === 404 || err.statusCode === 410) {
                        return { type: 'CLEANUP', subscription: subRow.subscription };
                    }
                    console.error('[PUSH-ERROR]', err.message);
                    return { type: 'ERROR', error: err.message };
                });
        });
        tasks.push(...webPushTasks);

        // 2. Allen-Steel 연동 발송 태스크 구성
        tasks.push(this.sendToAllenSteel(payload));

        // 3. 병렬 실행 및 결과 취합 (Settled 사용하여 하나가 죽어도 나머지는 가도록 함)
        const results = await Promise.allSettled(tasks);
        
        const cleanupNeeded = results
            .filter(r => r.status === 'fulfilled' && r.value && r.value.type === 'CLEANUP')
            .map(r => r.value.subscription);

        return {
            totalSent: results.length,
            cleanupNeeded
        };
    }
}

module.exports = new NotificationService();
