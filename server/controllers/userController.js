const bcrypt = require('bcryptjs');
const db = require('../config/db');

// GET /api/users
async function getUsers(req, res) {
  try {
    const { search, department_id, status } = req.query;
    const currentUser = req.user;

    let query = `
      SELECT u.id, u.username, u.full_name, u.email, u.facebook_url, u.role, u.department_id, u.status, u.created_at,
             u.avatar_url, u.two_factor_enabled,
             d.name as department_name, d.code as department_code, d.color as department_color
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (currentUser.role === 'ADMIN_CAP_2') {
      query += ` AND u.department_id = ? `;
      params.push(currentUser.department_id);
    } else if (department_id) {
      query += ` AND u.department_id = ? `;
      params.push(department_id);
    }

    if (status) {
      query += ` AND u.status = ? `;
      params.push(status);
    }

    if (search && search.trim() !== '') {
      query += ` AND (LOWER(u.full_name) LIKE ? OR LOWER(u.username) LIKE ? OR LOWER(u.email) LIKE ?) `;
      const s = `%${search.trim().toLowerCase()}%`;
      params.push(s, s, s);
    }

    query += ` ORDER BY u.status ASC, u.department_id ASC, u.full_name ASC `;

    const users = await db.all(query, params);
    return res.json({ success: true, users });
  } catch (error) {
    console.error('Error in getUsers:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// POST /api/users
async function createUser(req, res) {
  try {
    const { username, password, full_name, email, facebook_url, role, department_id } = req.body;
    const currentUser = req.user;

    if (!username || !password || !full_name || !email || !department_id) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đủ: Họ tên, Tên đăng nhập, Mật khẩu, Email, Phân ban.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanFb = (facebook_url || '').trim();

    const exists = await db.get('SELECT id FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?', [cleanUsername, cleanEmail]);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Tên đăng nhập hoặc email đã tồn tại.' });
    }

    let targetRole = 'USER';
    let targetDept = department_id;

    if (currentUser.role === 'ADMIN_TONG') {
      if (role === 'ADMIN_CAP_2') {
        targetRole = 'ADMIN_CAP_2';
      }
    } else if (currentUser.role === 'ADMIN_CAP_2') {
      targetRole = 'USER';
      targetDept = currentUser.department_id;
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const result = await db.run(`
      INSERT INTO users (username, password_hash, full_name, email, facebook_url, role, department_id, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    `, [cleanUsername, password_hash, full_name.trim(), cleanEmail, cleanFb, targetRole, targetDept, currentUser.id]);

    return res.status(201).json({
      success: true,
      message: `Đã tạo tài khoản ${targetRole === 'ADMIN_CAP_2' ? 'Admin Cấp 2' : 'Thành viên'} thành công!`,
      userId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error in createUser:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// PUT /api/users/:id/approve
async function approveUser(req, res) {
  try {
    const userId = req.params.id;
    const { department_id } = req.body || {};

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    const finalDept = department_id || user.department_id;
    await db.run(`
      UPDATE users 
      SET status = 'ACTIVE', department_id = ? 
      WHERE id = ?
    `, [finalDept, userId]);

    return res.json({ success: true, message: 'Đã phê duyệt tài khoản thành công!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// PUT /api/users/:id/reject
async function rejectUser(req, res) {
  try {
    const userId = req.params.id;
    await db.run(`UPDATE users SET status = 'REJECTED' WHERE id = ?`, [userId]);
    return res.json({ success: true, message: 'Đã từ chối tài khoản này.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// PUT /api/users/:id/change-department
async function changeDepartment(req, res) {
  try {
    const userId = req.params.id;
    const { department_id } = req.body;

    if (!department_id) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn phân ban mới.' });
    }

    const dept = await db.get('SELECT * FROM departments WHERE id = ?', [department_id]);
    if (!dept) {
      return res.status(400).json({ success: false, message: 'Phân ban không hợp lệ.' });
    }

    await db.run('UPDATE users SET department_id = ? WHERE id = ?', [department_id, userId]);

    return res.json({ success: true, message: `Đã chuyển sang ${dept.name} thành công!` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// PUT /api/users/:id/change-role
async function changeRole(req, res) {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    const allowedRoles = ['USER', 'ADMIN_CAP_2', 'KIEM_DUYET'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vai trò chỉ có thể là CTV (USER), Người kiểm duyệt (KIEM_DUYET) hoặc BCH (ADMIN_CAP_2).' 
      });
    }

    const targetUser = await db.get('SELECT id, username, role, full_name FROM users WHERE id = ?', [userId]);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    if (targetUser.role === 'ADMIN_TONG') {
      return res.status(400).json({ success: false, message: 'Không thể thay đổi vai trò của Admin Tổng.' });
    }

    await db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

    let roleName = 'CTV (Cộng tác viên)';
    if (role === 'ADMIN_CAP_2') roleName = 'BCH (Admin Cấp 2)';
    else if (role === 'KIEM_DUYET') roleName = 'Người kiểm duyệt';

    return res.json({ 
      success: true, 
      message: `Đã đổi vai trò của ${targetUser.full_name} (@${targetUser.username}) thành "${roleName}" thành công!` 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// DELETE /api/users/:id
async function deleteUser(req, res) {
  try {
    const userId = req.params.id;
    const currentUser = req.user;

    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản cần xóa.' });
    }

    if (user.role === 'ADMIN_TONG') {
      return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản Admin Tổng.' });
    }

    if (currentUser.role === 'ADMIN_CAP_2') {
      if (user.department_id !== currentUser.department_id) {
        return res.status(403).json({ success: false, message: 'Bạn chỉ có quyền xóa thành viên trong ban của mình.' });
      }
      if (user.role === 'ADMIN_CAP_2') {
        return res.status(403).json({ success: false, message: 'Bạn không thể xóa quản trị viên khác.' });
      }
    }

    await db.run('DELETE FROM users WHERE id = ?', [userId]);
    return res.json({ success: true, message: 'Đã xóa tài khoản thành công.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getUsers,
  createUser,
  approveUser,
  rejectUser,
  changeDepartment,
  changeRole,
  deleteUser
};
