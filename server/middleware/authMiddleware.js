const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'doantruong_secret_bump_key_2026';

async function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để tiếp tục.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.get(`
      SELECT u.id, u.username, u.full_name, u.email, u.facebook_url, u.role, u.department_id, u.status,
             u.avatar_url, u.two_factor_enabled, u.two_factor_method,
             d.name as department_name, d.code as department_code, d.color as department_color
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
    `, [decoded.id]);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại hoặc đã bị xóa.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Tài khoản của bạn chưa được Admin Tổng phê duyệt hoặc đã bị khóa.' });
    }

    // Check device session validity in login_sessions
    const deviceId = (req.headers['x-device-id'] || decoded.device_id || '').trim();
    if (deviceId) {
      const activeSession = await db.get(`
        SELECT id, is_trusted FROM login_sessions 
        WHERE user_id = ? AND device_id = ?
      `, [user.id, deviceId]);

      if (!activeSession) {
        let remainingSeconds = 1200;
        try {
          const lockout = await db.get(`
            SELECT * FROM device_lockouts 
            WHERE device_id = ? AND locked_until > CURRENT_TIMESTAMP 
            ORDER BY locked_until DESC LIMIT 1
          `, [deviceId]);
          if (lockout) {
            remainingSeconds = Math.max(1, Math.ceil((new Date(lockout.locked_until).getTime() - Date.now()) / 1000));
          }
        } catch (e) {}

        return res.status(401).json({
          success: false,
          code: 'SESSION_REVOKED',
          locked_out: true,
          remaining_seconds: remainingSeconds,
          message: 'Bạn đã bị từ chối đăng nhập từ thiết bị tin cậy, đợi 20 phút để vào lại.'
        });
      }

      // Update last seen for active session
      try {
        await db.run('UPDATE login_sessions SET last_seen = CURRENT_TIMESTAMP, is_online = 1 WHERE id = ?', [activeSession.id]);
      } catch (e) {}
    }

    req.user = user;
    req.deviceId = deviceId;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.' });
  }
}

// Only Admin Tổng (Super Admin)
function requireAdminTong(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN_TONG') {
    return res.status(403).json({ success: false, message: 'Chỉ Admin Tổng mới có quyền thực hiện thao tác này.' });
  }
  next();
}

// Can review confirms (Admin Tổng & Người kiểm duyệt)
function requireCanReview(req, res, next) {
  if (!req.user || (req.user.role !== 'ADMIN_TONG' && req.user.role !== 'KIEM_DUYET' && req.user.role !== 'MODERATOR')) {
    return res.status(403).json({ success: false, message: 'Chỉ Admin Tổng và Người kiểm duyệt mới có quyền duyệt confirm.' });
  }
  next();
}

// Can track progress / view unconfirmed / export excel (Admin Tổng, Admin Cấp 2, Người kiểm duyệt)
function requireCanTrackProgress(req, res, next) {
  if (!req.user || (req.user.role !== 'ADMIN_TONG' && req.user.role !== 'ADMIN_CAP_2' && req.user.role !== 'KIEM_DUYET' && req.user.role !== 'MODERATOR')) {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập tiến độ.' });
  }
  next();
}

// General admin (includes Admin Tổng, Admin Cấp 2, Người kiểm duyệt)
function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'ADMIN_TONG' && req.user.role !== 'ADMIN_CAP_2' && req.user.role !== 'KIEM_DUYET' && req.user.role !== 'MODERATOR')) {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền quản trị.' });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  verifyToken,
  requireAdminTong,
  requireCanReview,
  requireCanTrackProgress,
  requireAdmin
};
