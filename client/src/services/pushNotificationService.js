import api, { getClientDeviceId } from './api';

// Utility to convert VAPID public key base64 string to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Ensure subscription keys (p256dh and auth) are reliably extracted across all browsers including Safari/WebKit
function serializeSubscription(subscription) {
  if (!subscription) return null;
  const json = subscription.toJSON ? subscription.toJSON() : {};
  let keys = json.keys || {};

  // Safari WebKit manual extraction fallback
  if (!keys.p256dh && subscription.getKey) {
    try {
      const rawKey = subscription.getKey('p256dh');
      if (rawKey) {
        keys.p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey)));
      }
    } catch (e) {}
  }

  if (!keys.auth && subscription.getKey) {
    try {
      const rawAuth = subscription.getKey('auth');
      if (rawAuth) {
        keys.auth = btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuth)));
      }
    } catch (e) {}
  }

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth
    }
  };
}

export const pushNotificationService = {
  // Check if browser supports ServiceWorker and Push API
  isSupported() {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  // Check if iOS device and whether in standalone (PWA) mode
  getDeviceEnvironment() {
    if (typeof window === 'undefined') return { isIOS: false, isStandalone: false };
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    return { isIOS, isStandalone };
  },

  // Get current permission status
  getPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  },

  // Register service worker
  async registerServiceWorker() {
    if (!this.isSupported()) return null;
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      return registration;
    } catch (err) {
      console.warn('⚠️ Lỗi đăng ký Service Worker:', err);
      return null;
    }
  },

  // Check if user has an active push subscription
  async isSubscribed() {
    if (!this.isSupported()) return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch (err) {
      return false;
    }
  },

  // Request permission and subscribe to web push (Fresh registration for iOS & Android)
  async subscribe() {
    if (!this.isSupported()) {
      throw new Error('Trình duyệt của bạn không hỗ trợ tính năng Web Push Notifications.');
    }

    const { isIOS, isStandalone } = this.getDeviceEnvironment();
    if (isIOS && !isStandalone) {
      throw new Error('Trên iPhone/iPad, Apple yêu cầu bạn Thêm ứng dụng vào Màn hình chính (PWA) trước khi có thể bật thông báo đẩy.');
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Bạn đã từ chối cấp quyền thông báo. Vui lòng vào Cài đặt của iPhone/trình duyệt để cấp lại quyền.');
    }

    // Register service worker
    const registration = await this.registerServiceWorker();
    if (!registration) {
      throw new Error('Không thể khởi tạo Service Worker trên thiết bị này.');
    }

    // Fetch VAPID public key from backend
    const keyRes = await api.get('/notifications/vapid-public-key');
    const vapidPublicKey = keyRes.data?.publicKey;
    if (!vapidPublicKey) {
      throw new Error('Không lấy được VAPID Public Key từ máy chủ.');
    }

    const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

    // Unsubscribe any stale subscription to guarantee fresh key alignment on iOS
    try {
      const oldSub = await registration.pushManager.getSubscription();
      if (oldSub) {
        await oldSub.unsubscribe();
      }
    } catch (e) {}

    // Subscribe freshly via PushManager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey
    });

    const serialized = serializeSubscription(subscription);
    if (!serialized || !serialized.keys?.p256dh || !serialized.keys?.auth) {
      throw new Error('Không thể trích xuất khóa mã hóa bảo mật từ trình duyệt.');
    }

    // Send subscription to server
    const res = await api.post('/notifications/subscribe', {
      subscription: serialized,
      device_id: getClientDeviceId()
    });

    return res.data;
  },

  // Send a test push notification to the current user's registered devices
  async testMyDevice() {
    const res = await api.post('/notifications/test-my-device');
    return res.data;
  },

  // Unsubscribe from push notifications
  async unsubscribe() {
    if (!this.isSupported()) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
    } catch (err) {
      console.error('Lỗi khi hủy đăng ký Push:', err);
    }
  },

  // Fetch in-app notifications
  async getNotifications() {
    const res = await api.get('/notifications/my-notifications');
    return res.data;
  },

  // Mark all or single notification as read
  async markAsRead(id = null) {
    const res = await api.put('/notifications/mark-read', id ? { id } : {});
    return res.data;
  },

  // Admin broadcast work announcement
  async sendBroadcast(title, message) {
    const res = await api.post('/notifications/broadcast', { title, message });
    return res.data;
  }
};

export default pushNotificationService;
