const CACHE_NAME = 'routinecore-cache-v7';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico',
    '/logo192.png',
    '/logo512.png',
    '/hero-bg.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

// 푸시 알람 수신 이벤트
self.addEventListener('push', (event) => {
    let data = { title: 'RoutineCore', body: '새로운 알림이 있습니다.' };
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    // [남개발 부장] 원격 알림 해제 기능 (다른 기기에서 확인 시 현재 기기의 알림을 닫음) 🚀
    if (data.type === 'DISMISS') {
        event.waitUntil(
            self.registration.getNotifications().then(notifications => {
                notifications.forEach(notification => {
                    if (notification.data && String(notification.data.todoId) === String(data.todoId)) {
                        notification.close();
                    }
                });
            })
        );
        return;
    }

    const options = {
        body: data.body,
        icon: data.icon || '/logo192.png',
        badge: '/logo192.png',
        tag: `todo-${data.data ? data.data.todoId : 'general'}`, // [남개발 부장] 중복 알림 방지용 태그 추가
        renotify: true, // [남개발 부장] 태그가 같아도 새 알림으로 알림음 발생
        vibrate: [200, 100, 200],
        data: data.data || {},
        requireInteraction: true,
        actions: [
            { action: 'confirm', title: '확인 ✅' },
            { action: 'rest', title: '쉬어감 💤' }
        ]
    };

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            const isAppFocused = clientList.some(client => client.focused);
            // [남개발 부장] 알람류(todo-*)는 사용자의 인지(소리/진동)를 보장하기 위해 앱 포커스 상태여도 푸시를 무조건 띄웁니다!
            const isAlarm = options.tag && options.tag.startsWith('todo-');
            if (isAppFocused && !isAlarm) {
                console.log('[SW] App is focused, skipping general push notification');
                return;
            }
            return self.registration.showNotification(data.title, options);
        })
    );
});

// 알림 클릭 이벤트
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const action = event.action;
    const todoId = event.notification.data.todoId;
    const username = event.notification.data.username || 'master';

    // API_BASE 설정 (Vite dev 서버 5173 사용시 3000포트, 그 외 현재 호스트)
    const apiHost = self.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
    const apiUrl = `${apiHost}/api/todos/${todoId}`;

    if (action === 'confirm') {
        const toggleUrl = `${apiHost}/api/daily-completions/toggle`;
        event.waitUntil(
            fetch(apiUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: true })
            }).then(() => {
                // [중요] 일일 완료 기록 동기화
                return fetch(toggleUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ todo_id: todoId, date: event.notification.data.date, username: username })
                });
            }).then(() => {
                return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            }).then((clientList) => {
                if (clientList.length > 0) clientList[0].postMessage({ type: 'REFRESH_TODOS' });
            })
        );
    } else if (action === 'rest') {
        event.waitUntil(
            fetch(apiUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFailed: true })
            }).then(() => {
                return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            }).then((clientList) => {
                if (clientList.length > 0) clientList[0].postMessage({ type: 'REFRESH_TODOS' });
            })
        );
    } else {
        // 일반 클릭시 앱 포커스
        event.waitUntil(
            self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                if (clientList.length > 0) {
                    let client = clientList[0];
                    for (let i = 0; i < clientList.length; i++) {
                        if (clientList[i].focused) {
                            client = clientList[i];
                        }
                    }
                    return client.focus();
                }
                return self.clients.openWindow('/');
            })
        );
    }
});
