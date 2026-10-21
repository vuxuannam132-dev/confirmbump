const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const db = require('./config/db');

function seed() {
  console.log('🌱 Đang khởi tạo dữ liệu mẫu...');

  // Ensure uploads directory exists with a sample image
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Create a minimal 1x1 png or simple svg/placeholder file for sample preview
  const sampleImagePath = path.join(uploadsDir, 'sample-confirm.png');
  if (!fs.existsSync(sampleImagePath)) {
    // 1x1 transparent png buffer
    const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    fs.writeFileSync(sampleImagePath, Buffer.from(base64Png, 'base64'));
  }

  // Get department IDs
  const ttDept = db.prepare("SELECT id FROM departments WHERE code = 'TRUYEN_THONG'").get();
  const tkDept = db.prepare("SELECT id FROM departments WHERE code = 'THIET_KE'").get();
  const nsDept = db.prepare("SELECT id FROM departments WHERE code = 'NHAN_SU'").get();
  const hcDept = db.prepare("SELECT id FROM departments WHERE code = 'HAU_CAN'").get();

  const salt = bcrypt.genSaltSync(10);
  const adminPass = bcrypt.hashSync('admin123', salt);
  const userPass = bcrypt.hashSync('user123', salt);

  // Check or Insert Admin Tổng
  let adminTong = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
  if (!adminTong) {
    const insertAdmin = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, email, facebook_url, phone, role, department_id, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ADMIN_TONG', ?, 'ACTIVE')
    `);
    const res = insertAdmin.run(
      'admin',
      adminPass,
      'Đồng chí Bí Thư (Admin Tổng)',
      'admin@doantruong.edu.vn',
      'https://facebook.com/admin.doantruong',
      '0988111222',
      ttDept.id
    );
    adminTong = { id: res.lastInsertRowid };
    console.log('✅ Tạo tài khoản Admin Tổng: admin / admin123');
  }

  // Seed 4 Admin Cấp 2
  const admin2List = [
    { username: 'admin_truyenthong', name: 'Trưởng Ban Truyền Thông', email: 'truyenthong@doantruong.edu.vn', fb: 'https://facebook.com/truyenthong.doan', deptId: ttDept.id },
    { username: 'admin_thietke', name: 'Trưởng Ban Thiết Kế', email: 'thietke@doantruong.edu.vn', fb: 'https://facebook.com/thietke.doan', deptId: tkDept.id },
    { username: 'admin_nhansu', name: 'Trưởng Ban Nhân Sự', email: 'nhansu@doantruong.edu.vn', fb: 'https://facebook.com/nhansu.doan', deptId: nsDept.id },
    { username: 'admin_haucan', name: 'Trưởng Ban Hậu Cần', email: 'haucan@doantruong.edu.vn', fb: 'https://facebook.com/haucan.doan', deptId: hcDept.id }
  ];

  for (const a2 of admin2List) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(a2.username);
    if (!existing) {
      db.prepare(`
        INSERT INTO users (username, password_hash, full_name, email, facebook_url, role, department_id, status, created_by)
        VALUES (?, ?, ?, ?, ?, 'ADMIN_CAP_2', ?, 'ACTIVE', ?)
      `).run(a2.username, adminPass, a2.name, a2.email, a2.fb, a2.deptId, adminTong.id);
      console.log(`✅ Tạo Admin Cấp 2: ${a2.username} / admin123 (${a2.name})`);
    }
  }

  // Seed sample Users
  const userList = [
    { username: 'user_tt', name: 'Nguyễn Văn Truyền (Member TT)', email: 'vantruyen@doantruong.edu.vn', fb: 'https://facebook.com/vantruyen', deptId: ttDept.id },
    { username: 'user_tk', name: 'Lê Thị Thiết Kế (Member TK)', email: 'thietke.le@doantruong.edu.vn', fb: 'https://facebook.com/lethietke', deptId: tkDept.id }
  ];

  let sampleUser1Id = null;
  for (const u of userList) {
    let existing = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
    if (!existing) {
      const res = db.prepare(`
        INSERT INTO users (username, password_hash, full_name, email, facebook_url, role, department_id, status, created_by)
        VALUES (?, ?, ?, ?, ?, 'USER', ?, 'ACTIVE', ?)
      `).run(u.username, userPass, u.name, u.email, u.fb, u.deptId, adminTong.id);
      existing = { id: res.lastInsertRowid };
      console.log(`✅ Tạo thành viên: ${u.username} / user123 (${u.name})`);
    }
    if (u.username === 'user_tt') sampleUser1Id = existing.id;
  }

  // Seed sample Tasks
  const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
  if (taskCount === 0) {
    const now = Date.now();
    const twoDaysLater = new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString();
    const makeupTwoDays = new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString();

    const tomorrow = new Date(now + 1 * 24 * 60 * 60 * 1000).toISOString();
    const makeupTomorrow = new Date(now + 4 * 24 * 60 * 60 * 1000).toISOString();

    // 1 day ago (Overdue - in makeup window!)
    const oneDayAgo = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();
    const makeupInTwoDays = new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString();

    const insertTask = db.prepare(`
      INSERT INTO tasks (title, description, platform, post_url, target_department_id, created_by, deadline, makeup_deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Task 1: Facebook (Toàn đoàn - Còn hạn 2 ngày)
    const t1 = insertTask.run(
      'Bump bài Facebook: Phát động Chiến dịch Tình nguyện Mùa Hè Xanh 2026',
      'Yêu cầu: Thả tim (hoặc Like), để lại 1 bình luận tích cực cổ vũ phong trào Đoàn và chia sẻ bài viết về trang cá nhân ở chế độ công khai kèm hashtag #MuaHeXanh2026 #DoanTruong.',
      'FACEBOOK',
      'https://www.facebook.com/DoanTruong/posts/101589123456789',
      null,
      adminTong.id,
      twoDaysLater,
      makeupTwoDays
    );

    // Task 2: TikTok (Toàn đoàn - Còn hạn 1 ngày)
    insertTask.run(
      'Bump bài TikTok: Video Giới thiệu 4 Phân ban Đoàn trường',
      'Yêu cầu: Xem hết video, thả tim và bình luận phân ban của bạn để tăng tương tác đẩy xu hướng TikTok.',
      'TIKTOK',
      'https://www.tiktok.com/@doantruong/video/73456789012345',
      null,
      adminTong.id,
      tomorrow,
      makeupTomorrow
    );

    // Task 3: Instagram (Quá hạn 1 ngày - ĐANG TRONG 3 NGÀY NỘP BÙ)
    const t3 = insertTask.run(
      'Bump bài Instagram: Bộ nhận diện Thiết kế Ngày hội Đoàn viên',
      'Yêu cầu: Thả tim bài viết, lưu bài (Save post) và comment tương tác với tài khoản chính thức Đoàn trường. Task đã quá hạn chính thức, hiện cho phép NỘP CONFIRM BÙ.',
      'INSTAGRAM',
      'https://www.instagram.com/p/C3xYz12345/',
      null,
      adminTong.id,
      oneDayAgo,
      makeupInTwoDays
    );

    // Add 1 sample pending submission from user_tt for Task 1 so Admin Tổng can test review
    if (sampleUser1Id && t1.lastInsertRowid) {
      db.prepare(`
        INSERT INTO confirm_submissions (task_id, user_id, image_url, note, is_makeup, status)
        VALUES (?, ?, ?, ?, 0, 'PENDING')
      `).run(t1.lastInsertRowid, sampleUser1Id, '/uploads/sample-confirm.png', 'Em đã like và chia sẻ bài viết công khai rồi ạ!');
      console.log('✅ Tạo 1 lượt nộp confirm mẫu đang chờ duyệt cho Task 1.');
    }

    console.log('✅ Đã tạo 3 task mẫu (Facebook, TikTok, Instagram nộp bù 3 ngày).');
  }

  console.log('🎉 Khởi tạo dữ liệu thành công!');
}

seed();
