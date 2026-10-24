const db = require('../config/db');
const pushService = require('../utils/pushService');

// GET /api/notifications/vapid-public-key
function getVapidPublicKey(req, res) {
  try {
    const key = pushService.getPublicKey();
    return res.json({ success: true, publicKey: key });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// POST /api/notifications/subscribe
async function subscribePush(req, res) {
  try {
    const { subscription } = req.body;
    const user = req.user;
    const userAgent = req.headers['user-agent'] || '';

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ success: false, message: 'Dữ liệu đăng ký push không hợp lệ (thiếu keys mã hóa).' });
    }

    const subId = await pushService.saveSubscription(user.id, subscription, userAgent);

    if (!subId) {
      return res.status(500).json({ success: false, message: 'Không thể lưu thông tin đăng ký thiết bị vào cơ sở dữ liệu.' });
    }

    // Immediately trigger a welcome notification to verify connection on user's phone
    const welcomePayload = {
      title: '🎉 Thông Báo Đoàn Trường Đã Hoạt Động',
      body: `Xin chào ${user.full_name}! Bạn sẽ nhận được thông báo ngay khi có task mới hoặc kết quả duyệt confirm.`,
      url: '/',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `welcome-${Date.now()}`
    };

    pushService.sendRawPush({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth
    }, welcomePayload).catch(err => {
      console.warn('Welcome push notification warning:', err.message);
    });

    return res.json({
      success: true,
      message: 'Đăng ký nhận thông báo đẩy về thiết bị thành công! Một thông báo thử nghiệm đã được gửi tới máy bạn.',
      subId
    });
  } catch (error) {
    console.error('Error in subscribePush:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// POST /api/notifications/test-my-device
async function testMyDevice(req, res) {
  try {
    const user = req.user;
    const subs = await db.all('SELECT * FROM push_subscriptions WHERE user_id = ?', [user.id]);

    if (!subs || subs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Chưa có thiết bị nào được lưu cho tài khoản này. Vui lòng bấm "Bật Thông Báo Ngay" trước.'
      });
    }

    const payload = {
      title: '🔔 Thông Báo Thử Nghiệm Từ Đoàn Trường',
      body: `Xin chào ${user.full_name}! Thông báo đẩy trên thiết bị của bạn đang hoạt động rất tốt!`,
      url: '/',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `test-push-${Date.now()}`
    };

    const results = [];
    for (const sub of subs) {
      const pushRes = await pushService.sendRawPush(sub, payload);
      let endpointHost = 'Unknown';
      try {
        endpointHost = new URL(sub.endpoint).hostname;
      } catch (e) {}

      results.push({
        id: sub.id,
        endpointHost,
        status: pushRes.ok ? 'SUCCESS' : 'FAILED',
        statusCode: pushRes.statusCode,
        error: pushRes.message || null
      });
    }

    const successCount = results.filter(r => r.status === 'SUCCESS').length;

    return res.json({
      success: successCount > 0,
      message: successCount > 0
        ? `Đã gửi thông báo thử nghiệm thành công tới ${successCount}/${subs.length} thiết bị!`
        : 'Gửi thông báo thử nghiệm thất bại. Vui lòng kiểm tra lại quyền thông báo của thiết bị.',
      results
    });
  } catch (error) {
    console.error('Error in testMyDevice:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// POST /api/notifications/unsubscribe
async function unsubscribePush(req, res) {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await pushService.removeSubscription(endpoint);
    }
    return res.json({ success: true, message: 'Đã hủy đăng ký nhận thông báo đẩy.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// GET /api/notifications/my-notifications
async function getMyNotifications(req, res) {
  try {
    const user = req.user;
    const isReviewer = user.role === 'ADMIN_TONG' || user.role === 'KIEM_DUYET' || user.role === 'MODERATOR';
    const isMemberDoingTasks = user.role === 'USER' || user.role === 'ADMIN_CAP_2' || user.role === 'KIEM_DUYET';

    let roleConditions = ["target_role = 'ALL'"];
    if (isReviewer) roleConditions.push("target_role = 'REVIEWERS'");
    if (isMemberDoingTasks) roleConditions.push("target_role = 'MEMBER_TASKS'");

    const query = `
      SELECT * FROM notifications
      WHERE user_id = ? OR (${roleConditions.join(' OR ')})
      ORDER BY created_at DESC
      LIMIT 30
    `;

    const notifications = await db.all(query, [user.id]);
    const unreadCount = notifications.filter(n => n.is_read === 0).length;

    return res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error in getMyNotifications:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// PUT /api/notifications/mark-read
async function markAsRead(req, res) {
  try {
    const user = req.user;
    const { id } = req.body || {};

    if (id) {
      await db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    } else {
      await db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ? OR target_role IS NOT NULL', [user.id]);
    }

    return res.json({ success: true, message: 'Đã đánh dấu đã đọc thông báo.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// POST /api/notifications/broadcast (Admin Tổng sends work announcement to all users)
async function sendBroadcast(req, res) {
  try {
    const { title, message } = req.body;
    const user = req.user;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tiêu đề và nội dung thông báo.' });
    }

    const sentCount = await pushService.notifyBroadcast(
      { title, body: message, url: '/' },
      user.full_name
    );

    return res.json({
      success: true,
      message: `Đã phát thông báo công việc tới toàn bộ đoàn viên (${sentCount} thiết bị nhận được thông báo đẩy)!`,
      sentCount
    });
  } catch (error) {
    console.error('Error in sendBroadcast:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
  testMyDevice,
  getMyNotifications,
  markAsRead,
  sendBroadcast
};
