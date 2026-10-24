const webpush = require('web-push');
const db = require('../config/db');

// VAPID Keys for Đoàn trường Web Push Notifications
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BNtSgMRaceaLQLPa66aCj9e-boBuZ_MeLr5WylHBUpAgHWoYcMaXgO4nAQhvsajNgAuf6u3GsFVOyDDBFLgzGuU';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'i8qnVMxU8nqXKQpTGIH67Jbhv0bAZUIhr0yI564-FWw';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin_BCH_doantruongdkhbt@doantruong.edu.vn';

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
async function saveSubscription(userId, subscription, userAgent = '') {
  if (!subscription || !subscription.endpoint || !subscription.keys) return null;
  const { endpoint, keys } = subscription;
  const { p256dh, auth } = keys;

  try {
    const existing = await db.get('SELECT id FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
    if (existing) {
      await db.run(
        'UPDATE push_subscriptions SET user_id = ?, p256dh = ?, auth = ?, user_agent = ? WHERE id = ?',
        [userId, p256dh, auth, userAgent, existing.id]
      );
      return existing.id;
    } else {
      const res = await db.run(
        'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent) VALUES (?, ?, ?, ?, ?)',
        [userId, endpoint, p256dh, auth, userAgent]
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
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    // 404 Not Found or 410 Gone means subscription expired or uninstalled
    if (err.statusCode === 404 || err.statusCode === 410) {
      await removeSubscription(sub.endpoint);
    } else {
      console.warn('⚠️ Lỗi gửi WebPush tới endpoint:', err.statusCode || err.message);
    }
    return false;
  }
}

// 5. Send push to list of subscriptions
async function dispatchPushToSubscriptions(subs, payload) {
  if (!subs || subs.length === 0) return 0;
  let sentCount = 0;
  await Promise.all(subs.map(async (sub) => {
    const ok = await sendRawPush(sub, payload);
    if (ok) sentCount++;
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

module.exports = {
  getPublicKey,
  saveSubscription,
  removeSubscription,
  notifyNewTask,
  notifyNewConfirm,
  notifyBroadcast,
  notifyConfirmResult,
  recordNotification
};
