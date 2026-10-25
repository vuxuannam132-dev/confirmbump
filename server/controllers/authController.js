const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { generateAndSendOtp, verifyOtp, generate9DigitOtp, sendTwoFactorOtp } = require('../utils/emailService');
const pushService = require('../utils/pushService');

/**
 * Lightweight User-Agent parser for OS and Browser
 */
function parseUserAgent(ua = '') {
  let browser = 'Trình duyệt web';
  let os = 'Thiết bị';

  if (!ua) return { browser, os };

  // Detect OS
  if (/windows phone/i.test(ua)) os = 'Windows Phone';
  else if (/windows nt 10\.0/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/iphone/i.test(ua)) os = 'iPhone (iOS)';
  else if (/ipad/i.test(ua)) os = 'iPad (iPadOS)';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  // Detect Browser
  if (/edg([ea]|ios)?\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/coc_coc/i.test(ua)) browser = 'Cốc Cốc';
  else if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) browser = 'Google Chrome';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Apple Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';
  else if (/zalo/i.test(ua)) browser = 'Zalo App';

  return { browser, os };
}

/**
 * Extract client IP from request
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
}

/**
 * Mask email for privacy (e.g. ad***@dkhbt.edu.vn)
 */
function maskEmail(email = '') {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name[0]}*@${domain}`;
  return `${name.slice(0, 2)}${'*'.repeat(Math.min(name.length - 2, 5))}@${domain}`;
}

// POST /api/auth/send-otp
async function sendOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp địa chỉ email hợp lệ.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already used by an active user
    const existing = await db.get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email này đã được sử dụng bởi một tài khoản khác.' });
    }

    await generateAndSendOtp(cleanEmail, 'REGISTER');

    return res.json({
      success: true,
      message: `Mã xác nhận 6 số đã được gửi về email ${cleanEmail}. Vui lòng kiểm tra hộp thư đến (hoặc hòm thư Spam/Rác).`
    });
  } catch (error) {
    console.error('Error in sendOtp:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi gửi mã xác nhận: ' + error.message });
  }
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { full_name, email, otp_code, facebook_url, department_id, username, password } = req.body;

    if (!full_name || !email || !otp_code || !facebook_url || !department_id || !username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ tất cả các trường thông tin.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    // Verify OTP
    const isValidOtp = await verifyOtp(cleanEmail, otp_code);
    if (!isValidOtp) {
      return res.status(400).json({ success: false, message: 'Mã xác minh 6 số không đúng hoặc đã hết hạn (5 phút).' });
    }

    // Check username uniqueness
    const userExists = await db.get('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUsername]);
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.' });
    }

    // Check email uniqueness
    const emailExists = await db.get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email đã tồn tại trong hệ thống.' });
    }

    // Check department
    const dept = await db.get('SELECT id FROM departments WHERE id = ?', [department_id]);
    if (!dept) {
      return res.status(400).json({ success: false, message: 'Phân ban đã chọn không hợp lệ.' });
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    await db.run(`
      INSERT INTO users (username, password_hash, full_name, email, facebook_url, role, department_id, status)
      VALUES (?, ?, ?, ?, ?, 'USER', ?, 'PENDING_APPROVAL')
    `, [cleanUsername, password_hash, full_name.trim(), cleanEmail, facebook_url.trim(), department_id]);

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công! Tài khoản của bạn đang chờ Admin Tổng phê duyệt để kích hoạt vào phân ban.'
    });
  } catch (error) {
    console.error('Error in register:', error);
    return res.status(500).json({ success: false, message: 'Lỗi đăng ký: ' + error.message });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { username, password, device_id, device_name } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = await db.get(`
      SELECT u.*, d.name as department_name, d.code as department_code, d.color as department_color
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE LOWER(u.username) = ?
    `, [cleanUsername]);

    if (!user) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    if (user.status === 'PENDING_APPROVAL') {
      return res.status(403).json({
        success: false,
        status: 'PENDING_APPROVAL',
        message: `Tài khoản của bạn đang chờ Admin Tổng phê duyệt vào ${user.department_name || 'phân ban'}. Vui lòng liên hệ Admin Tổng nếu cần duyệt gấp!`
      });
    }

    if (user.status === 'REJECTED') {
      return res.status(403).json({
        success: false,
        status: 'REJECTED',
        message: 'Tài khoản của bạn đã bị từ chối phê duyệt tham gia.'
      });
    }

    // Determine device info
    const userAgent = req.headers['user-agent'] || '';
    const { browser, os } = parseUserAgent(userAgent);
    const ip = getClientIp(req);
    const resolvedDeviceId = (device_id || req.headers['x-device-id'] || `device_${Buffer.from(cleanUsername + userAgent).toString('hex').slice(0, 16)}`).trim();
    const resolvedDeviceName = (device_name || req.headers['x-device-name'] || `${browser} trên ${os}`).trim();

    const sessionInfo = {
      device_id: resolvedDeviceId,
      device_name: resolvedDeviceName,
      os_name: os,
      browser_name: browser,
      ip_address: ip,
      location_text: 'Việt Nam'
    };

    // Check if this device is currently locked out (e.g. rejected by trusted device or revoked)
    try {
      const lockout = await db.get(`
        SELECT * FROM device_lockouts 
        WHERE device_id = ? AND locked_until > CURRENT_TIMESTAMP
        ORDER BY locked_until DESC LIMIT 1
      `, [resolvedDeviceId]);

      if (lockout) {
        const remainingMs = new Date(lockout.locked_until).getTime() - Date.now();
        const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
        return res.status(403).json({
          success: false,
          locked_out: true,
          remaining_seconds: remainingSeconds,
          locked_until: lockout.locked_until,
          message: 'Bạn đã bị từ chối đăng nhập từ thiết bị tin cậy, đợi 20 phút để vào lại.'
        });
      }
    } catch (lockErr) {}

    // Check if user has 2FA enabled
    const twoFactorEnabled = user.two_factor_enabled === 1 || user.two_factor_enabled === true;
    let isDeviceTrusted = false;

    if (twoFactorEnabled) {
      const trustedSession = await db.get(`
        SELECT id FROM login_sessions 
        WHERE user_id = ? AND device_id = ? AND is_trusted = 1
      `, [user.id, resolvedDeviceId]);

      if (trustedSession) {
        isDeviceTrusted = true;
      }
    }

    // If 2FA enabled and device is NOT trusted -> Trigger 2FA Challenge
    if (twoFactorEnabled && !isDeviceTrusted) {
      // For TRUSTED_DEVICE method: handle interactive approval flow
      if (user.two_factor_method === 'TRUSTED_DEVICE') {
        // Check if user has any trusted device registered
        const hasTrustedDevice = await db.get(`
          SELECT id FROM login_sessions 
          WHERE user_id = ? AND is_trusted = 1
          LIMIT 1
        `, [user.id]);

        if (!hasTrustedDevice) {
          // No trusted device yet -> let user register this device as the first
          const setupToken = crypto.randomBytes(32).toString('hex');
          try {
            await db.run('DELETE FROM two_factor_challenges WHERE user_id = ? AND is_verified = 0', [user.id]);
          } catch (e) {}

          await db.run(`
            INSERT INTO two_factor_challenges (user_id, challenge_token, otp_code, method, device_info, is_verified, expires_at)
            VALUES (?, ?, ?, ?, ?, 0, ?)
          `, [user.id, setupToken, '000000000', 'TRUSTED_DEVICE_SETUP', JSON.stringify(sessionInfo), new Date(Date.now() + 10 * 60 * 1000).toISOString()]);

          return res.json({
            success: true,
            require2fa: true,
            method: 'TRUSTED_DEVICE',
            no_trusted_devices: true,
            setup_token: setupToken,
            message: 'Bạn chưa có thiết bị tin cậy nào. Vui lòng đăng ký thiết bị này làm thiết bị tin cậy đầu tiên.'
          });
        }

        // Has trusted device(s) -> create challenge and wait for interactive approval
        const challengeToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        try {
          await db.run('DELETE FROM two_factor_challenges WHERE user_id = ? AND is_verified = 0', [user.id]);
        } catch (e) {}

        await db.run(`
          INSERT INTO two_factor_challenges (user_id, challenge_token, otp_code, method, device_info, is_verified, expires_at)
          VALUES (?, ?, ?, ?, ?, 0, ?)
        `, [user.id, challengeToken, '000000000', 'TRUSTED_DEVICE', JSON.stringify(sessionInfo), expiresAt]);

        // Send push notification to trusted devices
        await pushService.notifyTrustedDeviceApproval(user, sessionInfo, challengeToken);

        return res.json({
          success: true,
          require2fa: true,
          method: 'TRUSTED_DEVICE',
          no_trusted_devices: false,
          challenge_token: challengeToken,
          device_info: {
            device_name: resolvedDeviceName,
            ip_address: ip
          }
        });
      }

      // EMAIL (or other) 2FA method
      const otpCode = generate9DigitOtp();
      const challengeToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Clean old unverified challenges for user
      try {
        await db.run('DELETE FROM two_factor_challenges WHERE user_id = ? AND is_verified = 0', [user.id]);
      } catch (e) {}

      await db.run(`
        INSERT INTO two_factor_challenges (user_id, challenge_token, otp_code, method, device_info, is_verified, expires_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `, [user.id, challengeToken, otpCode, user.two_factor_method || 'EMAIL', JSON.stringify(sessionInfo), expiresAt]);

      // Send OTP via email if method is EMAIL
      if (!user.two_factor_method || user.two_factor_method === 'EMAIL') {
        await sendTwoFactorOtp(user.email, otpCode, sessionInfo, user.full_name);
      }

      // Trigger Push notification
      await pushService.notifyTwoFactorPrompt(user, sessionInfo);

      return res.json({
        success: true,
        require2fa: true,
        method: user.two_factor_method || 'EMAIL',
        challenge_token: challengeToken,
        email_masked: maskEmail(user.email)
      });
    }

    // No 2FA or device is trusted:
    // Check if device is new for this user
    const existingSession = await db.get(`
      SELECT id, is_trusted FROM login_sessions 
      WHERE user_id = ? AND device_id = ?
    `, [user.id, resolvedDeviceId]);

    if (!existingSession) {
      // Send alert for new device login
      await pushService.notifyNewDeviceLogin(user, sessionInfo);

      await db.run(`
        INSERT INTO login_sessions (user_id, device_id, device_name, os_name, browser_name, ip_address, location_text, is_trusted, is_online, last_seen)
        VALUES (?, ?, ?, ?, ?, ?, 'Việt Nam', ?, 1, CURRENT_TIMESTAMP)
      `, [user.id, resolvedDeviceId, resolvedDeviceName, os, browser, ip, isDeviceTrusted ? 1 : 0]);
    } else {
      await db.run(`
        UPDATE login_sessions 
        SET device_name = ?, os_name = ?, browser_name = ?, ip_address = ?, is_online = 1, last_seen = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [resolvedDeviceName, os, browser, ip, existingSession.id]);
    }

    const currentSession = await db.get(`
      SELECT * FROM login_sessions 
      WHERE user_id = ? AND device_id = ? 
      ORDER BY id DESC LIMIT 1
    `, [user.id, resolvedDeviceId]);

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, device_id: resolvedDeviceId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    delete user.password_hash;

    return res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user,
      session: currentSession
    });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({ success: false, message: 'Lỗi đăng nhập: ' + error.message });
  }
}

// POST /api/auth/forgot-password/send-otp
async function forgotPasswordSendOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp địa chỉ email hợp lệ.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists with this email
    const user = await db.get('SELECT id, full_name FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản nào gắn với email này.' });
    }

    await generateAndSendOtp(cleanEmail, 'RESET_PASSWORD', user.full_name);

    return res.json({
      success: true,
      message: `Mã xác thực 6 số đã được gửi về email ${cleanEmail}. Vui lòng kiểm tra hộp thư đến (hoặc hòm thư Spam/Rác).`
    });
  } catch (error) {
    console.error('Error in forgotPasswordSendOtp:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi gửi mã khôi phục: ' + error.message });
  }
}

// POST /api/auth/forgot-password/reset
async function forgotPasswordReset(req, res) {
  try {
    const { email, otp_code, new_password } = req.body;

    if (!email || !otp_code || !new_password) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ email, mã xác minh và mật khẩu mới.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify OTP
    const isValidOtp = await verifyOtp(cleanEmail, otp_code);
    if (!isValidOtp) {
      return res.status(400).json({ success: false, message: 'Mã xác minh không chính xác hoặc đã hết hạn.' });
    }

    // Hash new password
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(new_password, salt);

    // Update password
    await db.run('UPDATE users SET password_hash = ? WHERE LOWER(email) = ?', [password_hash, cleanEmail]);

    return res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.'
    });
  } catch (error) {
    console.error('Error in forgotPasswordReset:', error);
    return res.status(500).json({ success: false, message: 'Lỗi đặt lại mật khẩu: ' + error.message });
  }
}

// GET /api/auth/me
function getMe(req, res) {
  return res.json({
    success: true,
    user: req.user
  });
}

// PUT /api/auth/change-password
async function changePassword(req, res) {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' });
    }

    // Fetch user with password_hash
    const user = await db.get('SELECT id, password_hash FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài khoản.' });
    }

    const isMatch = bcrypt.compareSync(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không chính xác.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(new_password, salt);

    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, userId]);

    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.'
    });
  } catch (error) {
    console.error('Error in changePassword:', error);
    return res.status(500).json({ success: false, message: 'Lỗi đổi mật khẩu: ' + error.message });
  }
}

// DELETE /api/auth/delete-my-account
async function deleteMyAccount(req, res) {
  try {
    const userId = req.user.id;
    if (req.user.role === 'ADMIN_TONG') {
      return res.status(400).json({ success: false, message: 'Không thể tự xóa tài khoản Admin Tổng duy nhất.' });
    }

    await db.run('DELETE FROM users WHERE id = ?', [userId]);
    return res.json({ success: true, message: 'Đã xóa tài khoản thành công.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi khi xóa tài khoản: ' + error.message });
  }
}

// GET /api/auth/departments
async function getDepartments(req, res) {
  try {
    const departments = await db.all('SELECT * FROM departments ORDER BY id ASC');
    return res.json({ success: true, departments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// POST /api/auth/2fa/verify
async function verifyTwoFactor(req, res) {
  try {
    const { challenge_token, otp_code, trustThisDevice } = req.body;
    if (!challenge_token || !otp_code) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã xác thực 9 số và phiên đăng nhập.' });
    }

    const challenge = await db.get(`
      SELECT c.*, u.id as u_id, u.username, u.role, u.email, u.full_name, u.status, u.department_id,
             u.avatar_url, u.two_factor_enabled, u.two_factor_method,
             d.name as department_name, d.code as department_code, d.color as department_color
      FROM two_factor_challenges c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE c.challenge_token = ? AND c.is_verified = 0
    `, [challenge_token.trim()]);

    if (!challenge) {
      return res.status(400).json({ success: false, message: 'Phiên xác thực không tồn tại hoặc đã được sử dụng.' });
    }

    const isExpired = new Date(challenge.expires_at).getTime() < Date.now();
    if (isExpired) {
      return res.status(400).json({ success: false, message: 'Mã xác thực đã hết hạn (5 phút). Vui lòng đăng nhập lại để nhận mã mới.' });
    }

    // Compare 9-digit OTP (normalize whitespace)
    const cleanChallengeOtp = (challenge.otp_code || '').replace(/\s+/g, '');
    const cleanInputOtp = String(otp_code).replace(/\s+/g, '');

    if (cleanChallengeOtp !== cleanInputOtp) {
      return res.status(400).json({ success: false, message: 'Mã OTP xác thực 9 số không chính xác.' });
    }

    // Mark challenge as verified
    await db.run('UPDATE two_factor_challenges SET is_verified = 1 WHERE id = ?', [challenge.id]);

    let sessionInfo = {};
    try {
      sessionInfo = JSON.parse(challenge.device_info || '{}');
    } catch (e) {}

    const shouldTrust = trustThisDevice === true || trustThisDevice === 1 || trustThisDevice === 'true' ? 1 : 0;
    const deviceId = sessionInfo.device_id || `device_${Date.now()}`;
    const deviceName = sessionInfo.device_name || 'Thiết bị xác thực 2FA';
    const osName = sessionInfo.os_name || 'Thiết bị';
    const browserName = sessionInfo.browser_name || 'Trình duyệt web';
    const ipAddress = sessionInfo.ip_address || getClientIp(req);

    // Record / update session in login_sessions
    const existingSession = await db.get(`
      SELECT id, is_trusted FROM login_sessions 
      WHERE user_id = ? AND device_id = ?
    `, [challenge.user_id, deviceId]);

    if (existingSession) {
      const finalTrust = shouldTrust === 1 ? 1 : existingSession.is_trusted;
      await db.run(`
        UPDATE login_sessions 
        SET device_name = ?, os_name = ?, browser_name = ?, ip_address = ?, 
            is_trusted = ?, is_online = 1, last_seen = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [deviceName, osName, browserName, ipAddress, finalTrust, existingSession.id]);
    } else {
      await db.run(`
        INSERT INTO login_sessions (user_id, device_id, device_name, os_name, browser_name, ip_address, location_text, is_trusted, is_online, last_seen)
        VALUES (?, ?, ?, ?, ?, ?, 'Việt Nam', ?, 1, CURRENT_TIMESTAMP)
      `, [challenge.user_id, deviceId, deviceName, osName, browserName, ipAddress, shouldTrust]);
    }

    const session = await db.get(`
      SELECT * FROM login_sessions 
      WHERE user_id = ? AND device_id = ? 
      ORDER BY id DESC LIMIT 1
    `, [challenge.user_id, deviceId]);

    const user = {
      id: challenge.u_id,
      username: challenge.username,
      role: challenge.role,
      email: challenge.email,
      full_name: challenge.full_name,
      status: challenge.status,
      department_id: challenge.department_id,
      department_name: challenge.department_name,
      department_code: challenge.department_code,
      department_color: challenge.department_color,
      avatar_url: challenge.avatar_url,
      two_factor_enabled: challenge.two_factor_enabled,
      two_factor_method: challenge.two_factor_method
    };

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, device_id: deviceId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Trigger login success push notification
    await pushService.notifyLoginSuccess(user, sessionInfo);

    return res.json({
      success: true,
      message: 'Xác thực 2FA thành công!',
      token,
      user,
      session
    });
  } catch (error) {
    console.error('Error in verifyTwoFactor:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xác thực 2FA: ' + error.message });
  }
}

// GET /api/auth/sessions (verifyToken)
async function getLoginSessions(req, res) {
  try {
    const sessions = await db.all(`
      SELECT * FROM login_sessions 
      WHERE user_id = ? 
      ORDER BY last_seen DESC, id DESC
    `, [req.user.id]);
    return res.json({ success: true, sessions });
  } catch (error) {
    console.error('Error in getLoginSessions:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// POST /api/auth/sessions/trust (verifyToken)
async function trustLoginSession(req, res) {
  try {
    const { session_id, id, device_id } = req.body;
    const targetId = session_id || id;

    if (targetId) {
      await db.run('UPDATE login_sessions SET is_trusted = 1 WHERE id = ? AND user_id = ?', [targetId, req.user.id]);
    } else if (device_id) {
      await db.run('UPDATE login_sessions SET is_trusted = 1 WHERE device_id = ? AND user_id = ?', [device_id, req.user.id]);
    } else {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ID phiên hoặc mã thiết bị.' });
    }

    return res.json({ success: true, message: 'Đã đánh dấu thiết bị là đáng tin cậy thành công!' });
  } catch (error) {
    console.error('Error in trustLoginSession:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// POST /api/auth/sessions/revoke (verifyToken)
async function revokeLoginSession(req, res) {
  try {
    const { session_id, id, device_id } = req.body;
    const targetId = session_id || id;
    let targetDeviceId = device_id;

    if (targetId) {
      const sess = await db.get('SELECT device_id FROM login_sessions WHERE id = ? AND user_id = ?', [targetId, req.user.id]);
      if (sess?.device_id) targetDeviceId = sess.device_id;
      await db.run('DELETE FROM login_sessions WHERE id = ? AND user_id = ?', [targetId, req.user.id]);
    } else if (device_id) {
      await db.run('DELETE FROM login_sessions WHERE device_id = ? AND user_id = ?', [device_id, req.user.id]);
    } else {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ID phiên hoặc mã thiết bị cần thu hồi.' });
    }

    // Lock out revoked device for 20 minutes (1200s)
    if (targetDeviceId) {
      const lockedUntil = new Date(Date.now() + 20 * 60 * 1000).toISOString();
      try {
        await db.run(`
          INSERT INTO device_lockouts (device_id, user_id, locked_until, reason)
          VALUES (?, ?, ?, 'REVOKED_SESSION')
        `, [targetDeviceId, req.user.id, lockedUntil]);
      } catch (e) {}
    }

    return res.json({ success: true, message: 'Đã thu hồi phiên đăng nhập thành công!' });
  } catch (error) {
    console.error('Error in revokeLoginSession:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// POST /api/auth/2fa/toggle (verifyToken)
async function toggleTwoFactor(req, res) {
  try {
    const { enabled, method } = req.body;
    const isEnabled = (enabled === true || enabled === 1 || enabled === '1') ? 1 : 0;
    const twoFactorMethod = method || 'EMAIL';

    await db.run(`
      UPDATE users 
      SET two_factor_enabled = ?, two_factor_method = ? 
      WHERE id = ?
    `, [isEnabled, twoFactorMethod, req.user.id]);

    return res.json({
      success: true,
      two_factor_enabled: isEnabled,
      two_factor_method: twoFactorMethod,
      message: isEnabled 
        ? 'Đã kích hoạt xác thực 2 lớp (2FA) bảo mật thành công!' 
        : 'Đã tắt xác thực 2 lớp (2FA).'
    });
  } catch (error) {
    console.error('Error in toggleTwoFactor:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// POST /api/auth/update-avatar (verifyToken)
async function updateAvatar(req, res) {
  try {
    const { avatar_url } = req.body;
    if (!avatar_url || typeof avatar_url !== 'string') {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp URL hoặc mã biểu tượng đại diện hợp lệ.' });
    }

    const cleanAvatar = avatar_url.trim();
    await db.run('UPDATE users SET avatar_url = ? WHERE id = ?', [cleanAvatar, req.user.id]);

    return res.json({
      success: true,
      avatar_url: cleanAvatar,
      message: 'Cập nhật ảnh đại diện thành công!'
    });
  } catch (error) {
    console.error('Error in updateAvatar:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// POST /api/auth/2fa/approve-device (verifyToken - called by trusted device to approve/reject)
async function approveTrustedDevice(req, res) {
  try {
    const { challenge_token, approved } = req.body;
    const userId = req.user.id;

    if (!challenge_token) {
      return res.status(400).json({ success: false, message: 'Thiếu challenge token.' });
    }

    const challenge = await db.get(`
      SELECT * FROM two_factor_challenges 
      WHERE challenge_token = ? AND user_id = ? AND is_verified = 0 AND method = 'TRUSTED_DEVICE'
    `, [challenge_token, userId]);

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu xác thực hoặc đã hết hạn.' });
    }

    const isExpired = new Date(challenge.expires_at).getTime() < Date.now();
    if (isExpired) {
      return res.status(400).json({ success: false, message: 'Yêu cầu xác thực đã hết hạn.' });
    }

    if (approved === false || approved === 'false') {
      // Parse device_id from challenge
      let sessionInfo = {};
      try { sessionInfo = JSON.parse(challenge.device_info || '{}'); } catch (e) {}
      const targetDeviceId = sessionInfo.device_id;

      // Lock out rejected device for 20 minutes (1200 seconds)
      if (targetDeviceId) {
        const lockedUntil = new Date(Date.now() + 20 * 60 * 1000).toISOString();
        try {
          await db.run(`
            INSERT INTO device_lockouts (device_id, user_id, locked_until, reason)
            VALUES (?, ?, ?, 'REJECTED_BY_TRUSTED_DEVICE')
          `, [targetDeviceId, userId, lockedUntil]);
        } catch (e) {}
      }

      // Mark challenge as rejected (-1) so polling client picks it up
      await db.run('UPDATE two_factor_challenges SET is_verified = -1 WHERE id = ?', [challenge.id]);
      return res.json({ success: true, approved: false, message: 'Đã từ chối yêu cầu đăng nhập. Thiết bị này đã bị tạm khóa 20 phút.' });
    }

    // Approved
    await db.run('UPDATE two_factor_challenges SET is_verified = 1 WHERE id = ?', [challenge.id]);
    return res.json({ success: true, approved: true, message: 'Đã chấp thuận đăng nhập thành công!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// GET /api/auth/2fa/status?token=xxx (public - polled by untrusted device waiting for approval)
async function checkTwoFactorStatus(req, res) {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Thiếu token.' });
    }

    const challenge = await db.get(`
      SELECT c.*, u.id as u_id, u.username, u.role, u.email, u.full_name, u.status,
             u.department_id, u.avatar_url, u.two_factor_enabled, u.two_factor_method,
             d.name as department_name, d.code as department_code, d.color as department_color
      FROM two_factor_challenges c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE c.challenge_token = ?
    `, [token]);

    if (!challenge) {
      return res.status(404).json({ success: false, status: 'NOT_FOUND' });
    }

    // If challenge was rejected by trusted device
    if (challenge.is_verified === -1) {
      return res.json({
        success: true,
        status: 'REJECTED',
        locked_out: true,
        remaining_seconds: 1200,
        message: 'Bạn đã bị từ chối đăng nhập từ thiết bị tin cậy, đợi 20 phút để vào lại.'
      });
    }

    const isExpired = new Date(challenge.expires_at).getTime() < Date.now();
    if (isExpired) {
      return res.json({ success: true, status: 'EXPIRED' });
    }

    if (challenge.is_verified === 1) {
      // Approved - create JWT and record session
      let sessionInfo = {};
      try { sessionInfo = JSON.parse(challenge.device_info || '{}'); } catch (e) {}

      const deviceId = sessionInfo.device_id || `device_${Date.now()}`;
      const deviceName = sessionInfo.device_name || 'Thiết bị';
      const osName = sessionInfo.os_name || 'Thiết bị';
      const browserName = sessionInfo.browser_name || 'Trình duyệt web';
      const ipAddress = sessionInfo.ip_address || '127.0.0.1';

      // Record session
      const existingSession = await db.get(
        'SELECT id FROM login_sessions WHERE user_id = ? AND device_id = ?',
        [challenge.user_id, deviceId]
      );

      if (existingSession) {
        await db.run(
          'UPDATE login_sessions SET device_name=?, os_name=?, browser_name=?, ip_address=?, is_online=1, last_seen=CURRENT_TIMESTAMP WHERE id=?',
          [deviceName, osName, browserName, ipAddress, existingSession.id]
        );
      } else {
        await db.run(`
          INSERT INTO login_sessions (user_id, device_id, device_name, os_name, browser_name, ip_address, location_text, is_trusted, is_online, last_seen)
          VALUES (?, ?, ?, ?, ?, ?, 'Việt Nam', 0, 1, CURRENT_TIMESTAMP)
        `, [challenge.user_id, deviceId, deviceName, osName, browserName, ipAddress]);
      }

      const user = {
        id: challenge.u_id,
        username: challenge.username,
        role: challenge.role,
        email: challenge.email,
        full_name: challenge.full_name,
        status: challenge.status,
        department_id: challenge.department_id,
        department_name: challenge.department_name,
        department_code: challenge.department_code,
        department_color: challenge.department_color,
        avatar_url: challenge.avatar_url,
        two_factor_enabled: challenge.two_factor_enabled,
        two_factor_method: challenge.two_factor_method
      };

      const jwtToken = jwt.sign(
        { id: user.id, username: user.username, role: user.role, device_id: deviceId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Cleanup challenge
      await db.run('DELETE FROM two_factor_challenges WHERE id = ?', [challenge.id]);

      return res.json({
        success: true,
        status: 'APPROVED',
        token: jwtToken,
        user
      });
    }

    return res.json({ success: true, status: 'PENDING' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// POST /api/auth/2fa/set-first-trusted (public - registers current device as first trusted)
async function setFirstTrustedDevice(req, res) {
  try {
    const { setup_token, device_id, device_name } = req.body;
    if (!setup_token) {
      return res.status(400).json({ success: false, message: 'Thiếu setup token.' });
    }

    const challenge = await db.get(`
      SELECT c.*, u.id as u_id, u.username, u.role, u.email, u.full_name, u.status,
             u.department_id, u.avatar_url, u.two_factor_enabled, u.two_factor_method,
             d.name as department_name, d.code as department_code, d.color as department_color
      FROM two_factor_challenges c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE c.challenge_token = ? AND c.method = 'TRUSTED_DEVICE_SETUP' AND c.is_verified = 0
    `, [setup_token]);

    if (!challenge) {
      return res.status(404).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
    }

    const isExpired = new Date(challenge.expires_at).getTime() < Date.now();
    if (isExpired) {
      return res.status(400).json({ success: false, message: 'Token đã hết hạn. Vui lòng đăng nhập lại.' });
    }

    let sessionInfo = {};
    try { sessionInfo = JSON.parse(challenge.device_info || '{}'); } catch (e) {}

    const resolvedDeviceId = device_id || sessionInfo.device_id || `device_${Date.now()}`;
    const resolvedDeviceName = device_name || sessionInfo.device_name || 'Thiết bị tin cậy';
    const osName = sessionInfo.os_name || 'Thiết bị';
    const browserName = sessionInfo.browser_name || 'Trình duyệt web';
    const ipAddress = sessionInfo.ip_address || '127.0.0.1';

    const existingSession = await db.get(
      'SELECT id FROM login_sessions WHERE user_id = ? AND device_id = ?',
      [challenge.user_id, resolvedDeviceId]
    );

    if (existingSession) {
      await db.run(
        'UPDATE login_sessions SET is_trusted=1, device_name=?, os_name=?, browser_name=?, ip_address=?, is_online=1, last_seen=CURRENT_TIMESTAMP WHERE id=?',
        [resolvedDeviceName, osName, browserName, ipAddress, existingSession.id]
      );
    } else {
      await db.run(`
        INSERT INTO login_sessions (user_id, device_id, device_name, os_name, browser_name, ip_address, location_text, is_trusted, is_online, last_seen)
        VALUES (?, ?, ?, ?, ?, ?, 'Việt Nam', 1, 1, CURRENT_TIMESTAMP)
      `, [challenge.user_id, resolvedDeviceId, resolvedDeviceName, osName, browserName, ipAddress]);
    }

    // Mark challenge as done
    await db.run('UPDATE two_factor_challenges SET is_verified = 1 WHERE id = ?', [challenge.id]);

    const user = {
      id: challenge.u_id,
      username: challenge.username,
      role: challenge.role,
      email: challenge.email,
      full_name: challenge.full_name,
      status: challenge.status,
      department_id: challenge.department_id,
      department_name: challenge.department_name,
      department_code: challenge.department_code,
      department_color: challenge.department_color,
      avatar_url: challenge.avatar_url,
      two_factor_enabled: challenge.two_factor_enabled,
      two_factor_method: challenge.two_factor_method
    };

    const jwtToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role, device_id: resolvedDeviceId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Đã đăng ký thiết bị tin cậy và đăng nhập thành công!',
      token: jwtToken,
      user
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// GET /api/auth/2fa/pending-challenges (verifyToken - fetch pending 2FA approvals for user's trusted device)
async function getPendingTwoFactorChallenges(req, res) {
  try {
    const userId = req.user.id;
    const challenges = await db.all(`
      SELECT id, user_id, challenge_token, method, device_info, expires_at, created_at
      FROM two_factor_challenges
      WHERE user_id = ? AND method = 'TRUSTED_DEVICE' AND is_verified = 0 AND expires_at > CURRENT_TIMESTAMP
      ORDER BY id DESC
    `, [userId]);

    const formatted = (challenges || []).map(c => {
      let deviceInfo = {};
      try {
        deviceInfo = JSON.parse(c.device_info || '{}');
      } catch (e) {}

      return {
        id: c.id,
        challenge_token: c.challenge_token,
        method: c.method,
        device_info: deviceInfo,
        expires_at: c.expires_at,
        created_at: c.created_at
      };
    });

    return res.json({ success: true, challenges: formatted });
  } catch (error) {
    console.error('Error in getPendingTwoFactorChallenges:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// POST /api/auth/logout (verifyToken - marks current device offline and removes push sub)
async function logout(req, res) {
  try {
    const userId = req.user?.id;
    const deviceId = (req.deviceId || req.body?.device_id || req.headers['x-device-id'] || '').trim();

    if (userId && deviceId) {
      await db.run(
        'UPDATE login_sessions SET is_online = 0 WHERE user_id = ? AND device_id = ?',
        [userId, deviceId]
      );
      try {
        await db.run(
          'DELETE FROM push_subscriptions WHERE user_id = ? AND device_id = ?',
          [userId, deviceId]
        );
      } catch (e) {}
    }

    return res.json({ success: true, message: 'Đăng xuất thành công.' });
  } catch (error) {
    console.error('Error in logout:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  sendOtp,
  register,
  login,
  logout,
  verifyTwoFactor,
  approveTrustedDevice,
  checkTwoFactorStatus,
  setFirstTrustedDevice,
  getPendingTwoFactorChallenges,
  getLoginSessions,
  trustLoginSession,
  revokeLoginSession,
  toggleTwoFactor,
  updateAvatar,
  forgotPasswordSendOtp,
  forgotPasswordReset,
  getMe,
  changePassword,
  deleteMyAccount,
  getDepartments
};
