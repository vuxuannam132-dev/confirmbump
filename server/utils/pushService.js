const webpush = require('web-push');
const db = require('../config/db');

// VAPID Keys for Đoàn trường Web Push Notifications
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BNtSgMRaceaLQLPa66aCj9e-boBuZ_MeLr5WylHBUpAgHWoYcMaXgO4nAQhvsajNgAuf6u3GsFVOyDDBFLgzGuU';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'i8qnVMxU8nqXKQpTGIH67Jbhv0bAZUIhr0yI564-FWw';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'https://confirmbump.vercel.app';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (vErr) {
  console.warn('⚠️ Lỗi cấu hình VAPID webpush:', vErr.message);
}

// 1. Get Public Key for frontend subscription
function getPublicKey() {
  return VAPID_PUBLIC_KEY;
}

// 2. Save or update push subscription for a user
async function saveSubscription(userId, subscription, userAgent = '', deviceId = null) {
  if (!subscription || !subscription.endpoint || !subscription.keys) return null;
  const { endpoint, keys } = subscription;
  const { p256dh, auth } = keys;

  try {
    const existing = await db.get('SELECT id FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
    if (existing) {
      await db.run(
        'UPDATE push_subscriptions SET user_id = ?, device_id = COALESCE(?, device_id), p256dh = ?, auth = ?, user_agent = ? WHERE id = ?',
        [userId, deviceId, p256dh, auth, userAgent, existing.id]
      );
      return existing.id;
    } else {
      const res = await db.run(
        'INSERT INTO push_subscriptions (user_id, device_id, endpoint, p256dh, auth, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, deviceId, endpoint, p256dh, auth, userAgent]
      );
      return res.lastInsertRowid;
    }
  } catch (err) {
    console.error('Error saving push subscription:', err);
    return null;
  }
}

// 3. Remove invalid / expired subscription
async function removeSubscription(endpoint) {
  try {
    await db.run('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
  } catch (e) {}
}

// 4. Send push to a single subscription
async function sendRawPush(sub, payload) {
  try {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    const options = {
      TTL: 86400, // 24 hours
      urgency: 'high', // Critical for iOS/APNs immediate banner alert (apns-priority: 10)
      headers: {
        'Urgency': 'high',
        'Topic': 'confirmbump'
      }
    };

    const result = await webpush.sendNotification(pushSubscription, JSON.stringify(payload), options);
    return { ok: true, statusCode: result.statusCode || 201 };
  } catch (err) {
    console.error(`⚠️ Lỗi WebPush [${err.statusCode || 'N/A'}] tới endpoint ${sub.endpoint?.substring(0, 45)}... :`, err.body || err.message);
    // 404 Not Found or 410 Gone means subscription expired or uninstalled
    if (err.statusCode === 404 || err.statusCode === 410) {
      await removeSubscription(sub.endpoint);
    }
    return { ok: false, statusCode: err.statusCode, message: err.body || err.message };
  }
}

// 5. Send push to list of subscriptions
async function dispatchPushToSubscriptions(subs, payload) {
  if (!subs || subs.length === 0) return 0;
  let sentCount = 0;
  await Promise.all(subs.map(async (sub) => {
    const res = await sendRawPush(sub, payload);
    if (res && res.ok) sentCount++;
  }));
  return sentCount;
}

// 6. Record in-app notification in DB
async function recordNotification({ userId = null, targetRole = null, title, body, type, link = '/' }) {
  try {
    await db.run(
      'INSERT INTO notifications (user_id, target_role, title, body, type, link) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, targetRole, title, body, type, link]
    );
  } catch (err) {
    console.error('Error recording in-app notification:', err);
  }
}

// =========================================================================
// HIGH-LEVEL NOTIFICATION TRIGGERS
// =========================================================================

/**
 * Trigger 1: Thông báo task mới dành cho user và admin cấp 2 (và người kiểm duyệt)
 */
async function notifyNewTask(task) {
  const title = `🔥 Nhiệm vụ bump bài mới: ${task.title}`;
  const deadlineStr = new Date(task.deadline).toLocaleString('vi-VN');
  const body = `Hạn chót: ${deadlineStr}. Đoàn viên vui lòng vào xem và thực hiện tương tác ngay!`;
  const url = '/';

  // 1. In-app notification for all users doing tasks
  await recordNotification({
    targetRole: 'MEMBER_TASKS',
    title,
    body,
    type: 'NEW_TASK',
    link: url
  });

  // 2. Web push to all users who need to do tasks: USER, ADMIN_CAP_2, KIEM_DUYET
  try {
    let query = `
      SELECT ps.* FROM push_subscriptions ps
      JOIN users u ON ps.user_id = u.id
      WHERE u.status = 'ACTIVE' AND u.role IN ('USER', 'ADMIN_CAP_2', 'KIEM_DUYET')
    `;
    const params = [];
    if (task.target_department_id) {
      query += ' AND (u.department_id = ? OR u.role = ?)';
      params.push(task.target_department_id, 'ADMIN_TONG');
    }
    const subs = await db.all(query, params);

    const payload = {
      title,
      body,
      url,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `new-task-${task.id}`,
      data: { taskId: task.id, url }
    };

    return await dispatchPushToSubscriptions(subs, payload);
  } catch (err) {
    console.error('Error sending notifyNewTask:', err);
    return 0;
  }
}

/**
 * Trigger 2: Thông báo có người confirm dành cho Admin Tổng và Người kiểm duyệt
 */
async function notifyNewConfirm(task, member, submissionCount = 1) {
  const title = '✅ Có minh chứng bump bài mới!';
  const body = `${member.full_name} (@${member.username}) vừa nộp ${submissionCount > 1 ? submissionCount + ' ảnh ' : ''}confirm cho: "${task.title}". Bấm để duyệt ngay.`;
  const url = '/';

  // 1. Record in-app notification for reviewers
  await recordNotification({
    targetRole: 'REVIEWERS',
    title,
    body,
    type: 'NEW_CONFIRM',
    link: url
  });

  // 2. Web push to Admin Tổng and Người kiểm duyệt
  try {
    const subs = await db.all(`
      SELECT ps.* FROM push_subscriptions ps
      JOIN users u ON ps.user_id = u.id
      WHERE u.status = 'ACTIVE' AND u.role IN ('ADMIN_TONG', 'KIEM_DUYET', 'MODERATOR')
    `);

    const payload = {
      title,
      body,
      url,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `new-confirm-${Date.now()}`,
      data: { url, tab: 'review' }
    };

    return await dispatchPushToSubscriptions(subs, payload);
  } catch (err) {
    console.error('Error sending notifyNewConfirm:', err);
    return 0;
  }
}

/**
 * Trigger 3: Thông báo công việc dành cho toàn bộ user trong hệ thống (Broadcast)
 */
async function notifyBroadcast(announcement, senderName = 'Ban Chấp Hành Đoàn Trường') {
  const title = `📢 ${announcement.title || 'Thông Báo Công Việc'}`;
  const body = announcement.body || announcement.message || 'Có thông báo mới từ Ban Chấp Hành Đoàn trường, vui lòng xem chi tiết.';
  const url = announcement.url || '/';

  // 1. Record in-app notification for all users
  await recordNotification({
    targetRole: 'ALL',
    title,
    body,
    type: 'ANNOUNCEMENT',
    link: url
  });

  // 2. Web push to all subscribed users
  try {
    const subs = await db.all(`
      SELECT ps.* FROM push_subscriptions ps
      JOIN users u ON ps.user_id = u.id
      WHERE u.status = 'ACTIVE'
    `);

    const payload = {
      title,
      body,
      url,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `broadcast-${Date.now()}`,
      data: { url }
    };

    return await dispatchPushToSubscriptions(subs, payload);
  } catch (err) {
    console.error('Error sending notifyBroadcast:', err);
    return 0;
  }
}

/**
 * Trigger 4: Thông báo kết quả duyệt (Duyệt hoặc Từ chối) cho thành viên đã nộp
 */
async function notifyConfirmResult(submission, status, feedback) {
  const isApproved = status === 'APPROVED';
  const title = isApproved 
    ? '🎉 Minh chứng bump bài đã được DUYỆT!' 
    : '⚠️ Minh chứng bump bài BỊ TỪ CHỐI';
  const body = isApproved
    ? `Minh chứng cho bài "${submission.task_title || 'Nhiệm vụ'}" của bạn đã được kiểm duyệt chấp nhận!`
    : `Lý do: "${feedback || 'Chưa đạt yêu cầu'}". Vui lòng kiểm tra và nộp lại bổ sung.`;
  const url = '/';

  // 1. Record in-app notification for this specific user
  await recordNotification({
    userId: submission.user_id,
    title,
    body,
    type: isApproved ? 'CONFIRM_APPROVED' : 'CONFIRM_REJECTED',
    link: url
  });

  // 2. Web push to this user's devices
  try {
    const subs = await db.all('SELECT * FROM push_subscriptions WHERE user_id = ?', [submission.user_id]);
    const payload = {
      title,
      body,
      url,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `confirm-result-${submission.id}`,
      data: { url, tab: 'history' }
    };

    return await dispatchPushToSubscriptions(subs, payload);
  } catch (err) {
    console.error('Error sending notifyConfirmResult:', err);
    return 0;
  }
}

/**
 * Trigger 5: Cảnh báo đăng nhập từ thiết bị mới
 */
async function notifyNewDeviceLogin(user, sessionInfo = {}) {
  const deviceName = sessionInfo.device_name || 'Thiết bị mới';
  const ipAddress = sessionInfo.ip_address || 'N/A';
  const title = '⚠️ Cảnh báo: Đăng nhập từ thiết bị mới!';
  const body = `Tài khoản ${user.username} vừa đăng nhập trên ${deviceName} (IP: ${ipAddress}). Hãy kiểm tra lịch sử thiết bị và bảo mật 2FA ngay!`;
  const url = '/?tab=settings&focus=security';

  // 1. Record in-app notification
  await recordNotification({
    userId: user.id,
    title,
    body,
    type: 'NEW_DEVICE_LOGIN',
    link: url
  });

  // 2. Web push ONLY to user's trusted registered devices (is_trusted = 1)
  try {
    const subs = await db.all(`
      SELECT DISTINCT ps.* FROM push_subscriptions ps
      JOIN login_sessions ls ON ps.device_id = ls.device_id AND ps.user_id = ls.user_id
      WHERE ps.user_id = ? AND ls.is_trusted = 1
    `, [user.id]);
    const payload = {
      title,
      body,
      url,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `new-device-${Date.now()}`,
      data: { url, tab: 'settings', section: 'security', type: 'NEW_DEVICE_LOGIN' }
    };
    return await dispatchPushToSubscriptions(subs, payload);
  } catch (err) {
    console.error('Error sending notifyNewDeviceLogin:', err);
    return 0;
  }
}

/**
 * Trigger 6: Thông báo đăng nhập thành công
 */
async function notifyLoginSuccess(user, sessionInfo = {}) {
  const deviceName = sessionInfo.device_name || 'thiết bị của bạn';
  const title = '🔔 Đăng nhập thành công';
  const body = `Tài khoản ${user.username} vừa đăng nhập thành công trên ${deviceName}.`;
  const url = '/?tab=settings&focus=security';

  await recordNotification({
    userId: user.id,
    title,
    body,
    type: 'LOGIN_SUCCESS',
    link: url
  });

  try {
    const subs = await db.all('SELECT * FROM push_subscriptions WHERE user_id = ?', [user.id]);
    const payload = {
      title,
      body,
      url,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `login-success-${Date.now()}`,
      data: { url, tab: 'settings', section: 'security', type: 'LOGIN_SUCCESS' }
    };
    return await dispatchPushToSubscriptions(subs, payload);
  } catch (err) {
    console.error('Error sending notifyLoginSuccess:', err);
    return 0;
  }
}

/**
 * Trigger 7: Thông báo yêu cầu xác thực 2FA
 */
async function notifyTwoFactorPrompt(user, sessionInfo = {}) {
  const deviceName = sessionInfo.device_name || 'thiết bị';
  const title = '🔐 Yêu cầu xác thực 2FA';
  const body = `Có yêu cầu đăng nhập trên ${deviceName}. Vui lòng kiểm tra mã xác thực để tiếp tục.`;
  const url = '/?tab=settings&focus=security';

  await recordNotification({
    userId: user.id,
    title,
    body,
    type: '2FA_PROMPT',
    link: url
  });

  try {
    // Send ONLY to trusted devices
    const subs = await db.all(`
      SELECT DISTINCT ps.* FROM push_subscriptions ps
      JOIN login_sessions ls ON ps.device_id = ls.device_id AND ps.user_id = ls.user_id
      WHERE ps.user_id = ? AND ls.is_trusted = 1
    `, [user.id]);
    const payload = {
      title,
      body,
      url,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `2fa-prompt-${Date.now()}`,
      data: { url, tab: 'settings', section: 'security', type: '2FA_PROMPT' }
    };
    return await dispatchPushToSubscriptions(subs, payload);
  } catch (err) {
    console.error('Error sending notifyTwoFactorPrompt:', err);
    return 0;
  }
}

/**
 * Trigger 8: Thông báo yêu cầu phê duyệt thiết bị lạ (Trusted Device 2FA)
 * Gửi DUY NHẤT đến các thiết bị đã được tin cậy (is_trusted = 1) của user
 */
async function notifyTrustedDeviceApproval(user, sessionInfo = {}, challengeToken) {
  try {
    const title = '🔐 Yêu cầu đăng nhập từ thiết bị lạ!';
    const body = `Tài khoản @${user.username} đang đăng nhập từ "${sessionInfo.device_name || 'Thiết bị mới'}" (IP: ${sessionInfo.ip_address || 'N/A'}). Bạn có cho phép không? Ấn vào để xem chi tiết.`;
    const url = `/?tab=settings&section=security`;

    await recordNotification({
      userId: user.id,
      title,
      body,
      type: 'TRUSTED_DEVICE_APPROVAL',
      link: url
    });

    // Send ONLY to confirmed trusted devices
    try {
      const subs = await db.all(`
        SELECT DISTINCT ps.* FROM push_subscriptions ps
        JOIN login_sessions ls ON ps.device_id = ls.device_id AND ps.user_id = ls.user_id
        WHERE ps.user_id = ? AND ls.is_trusted = 1
      `, [user.id]);

      const payload = {
        title,
        body,
        url,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        requireInteraction: true,
        tag: `trusted-device-approval-${challengeToken.slice(0, 8)}`,
        data: {
          url,
          tab: 'settings',
          section: 'security',
          type: 'TRUSTED_DEVICE_APPROVAL',
          challenge_token: challengeToken,
          device_name: sessionInfo.device_name || 'Thiết bị mới',
          ip_address: sessionInfo.ip_address || 'N/A',
          timestamp: Date.now()
        }
      };

      const sent = await dispatchPushToSubscriptions(subs, payload);
      console.log(`[Push] Sent trusted device approval request to user ${user.username} (${sent} trusted subscriptions)`);
      return sent;
    } catch (err) {
      console.error('[Push] Failed to send trusted device approval push:', err.message);
      return 0;
    }
  } catch (error) {
    console.error('[Push] Failed to send trusted device approval:', error.message);
    return 0;
  }
}

module.exports = {
  getPublicKey,
  saveSubscription,
  removeSubscription,
  sendRawPush,
  notifyNewTask,
  notifyNewConfirm,
  notifyBroadcast,
  notifyConfirmResult,
  notifyNewDeviceLogin,
  notifyLoginSuccess,
  notifyTwoFactorPrompt,
  notifyTrustedDeviceApproval,
  recordNotification
};
