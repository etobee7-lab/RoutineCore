const CACHE_NAME = 'routinecore-cache-v3';
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

    const options = {
        body: data.body,
        icon: data.icon || '/logo192.png',
        badge: '/logo192.png',
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
            if (isAppFocused) {
                console.log('[SW] App is focused, skipping push notification');
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
        event.waitUntil(
            fetch(apiUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: true })
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
