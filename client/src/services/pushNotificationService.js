import api from './api';

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

  // Request permission and subscribe to web push
  async subscribe() {
    if (!this.isSupported()) {
      throw new Error('Trình duyệt của bạn không hỗ trợ tính năng Web Push Notifications.');
    }

    const { isIOS, isStandalone } = this.getDeviceEnvironment();
    if (isIOS && !isStandalone) {
      throw new Error('Trên iPhone/iPad, bạn cần Thêm ứng dụng vào Màn hình chính (PWA) trước khi có thể bật thông báo đẩy.');
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Bạn đã từ chối cấp quyền thông báo. Vui lòng bật lại trong Cài đặt trình duyệt/thiết bị.');
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

    // Subscribe via PushManager
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    // Send subscription to server
    await api.post('/notifications/subscribe', {
      subscription: subscription.toJSON()
    });

    return subscription;
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
