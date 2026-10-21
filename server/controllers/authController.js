const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { generateAndSendOtp, verifyOtp } = require('../utils/emailService');

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

    const { otpCode } = await generateAndSendOtp(cleanEmail);

    return res.json({
      success: true,
      message: 'Mã xác nhận 6 số đã được tạo và gửi đến email của bạn.',
      devOtp: otpCode
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
    const { username, password } = req.body;
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

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    delete user.password_hash;

    return res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user
    });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({ success: false, message: 'Lỗi đăng nhập: ' + error.message });
  }
}

// GET /api/auth/me
function getMe(req, res) {
  return res.json({
    success: true,
    user: req.user
  });
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

module.exports = {
  sendOtp,
  register,
  login,
  getMe,
  deleteMyAccount,
  getDepartments
};
