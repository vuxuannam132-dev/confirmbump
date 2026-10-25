// Service Worker for Đoàn Trường BUMP Push Notifications
const CACHE_NAME = 'confirmbump-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification event (Optimized for Apple iOS Safari & Android)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Thông Báo Đoàn Trường BUMP', body: event.data.text() };
    }
  }

  const title = data.title || 'Thông Báo Đoàn Trường BUMP';
  const body = data.body || 'Bạn có thông báo mới từ hệ thống Đoàn Trường.';
  
  // Use absolute icon URLs for iOS WebKit compatibility
  const origin = self.location ? self.location.origin : '';
  const iconUrl = origin ? `${origin}/icon-192.png` : '/icon-192.png';

  const notificationOptions = {
    body: body,
    icon: iconUrl,
    badge: iconUrl,
    tag: data.tag || `bump-${Date.now()}`,
    data: {
      url: data.url || '/',
      ...(data.data || {})
    }
  };

  // Safe notification display with automatic fallback for strict WebKit environments
  const showPromise = self.registration.showNotification(title, notificationOptions)
    .catch((err) => {
      console.warn('[SW] Primary showNotification failed, attempting minimal options fallback:', err);
      // Minimal fallback that works across all iOS / WebKit versions
      return self.registration.showNotification(title, {
        body: body,
        tag: `fallback-${Date.now()}`
      });
    });

  // Broadcast message to any active foreground clients so in-app banner can trigger
  const broadcastPromise = self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({
          type: 'PUSH_NOTIFICATION_RECEIVED',
          title: title,
          body: body,
          url: data.url || '/'
        });
      });
    })
    .catch(() => {});

  event.waitUntil(Promise.all([showPromise, broadcastPromise]));
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/?tab=settings&focus=security';
  const targetTab = notifData.tab || 'settings';
  const targetSection = notifData.section || 'security';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If window/tab already open, focus it and tell React to switch tab immediately
      for (const client of clientList) {
        if ('focus' in client) {
          try {
            client.postMessage({
              type: 'NAVIGATE_TAB',
              tab: targetTab,
              section: targetSection,
              url: targetUrl
            });
          } catch (e) {}

          if ('navigate' in client && targetUrl) {
            try {
              client.navigate(targetUrl);
            } catch (e) {}
          }
          return client.focus();
        }
      }
      // If app is not open at all, open window with the target URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
