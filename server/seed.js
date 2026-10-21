const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function seedClean() {
  console.log('🧹 Đang làm sạch toàn bộ dữ liệu hệ thống...');

  // Ensure DB initialized
  await db.initDb();

  // Clean all tasks, submissions, and old test users
  await db.run('DELETE FROM confirm_submissions');
  await db.run('DELETE FROM tasks');
  await db.run('DELETE FROM email_otps');
  await db.run(`
    DELETE FROM users 
    WHERE username != 'admin_BCH_doantruongdkhbt'
  `);

  console.log('✅ Đã dọn dẹp sạch toàn bộ task, minh chứng nộp bài và các user test.');

  // Check official Super Admin
  const admin = await db.get("SELECT * FROM users WHERE username = 'admin_BCH_doantruongdkhbt'");
  if (admin) {
    console.log('================================================================');
    console.log('👑 TÀI KHOẢN ADMIN TỔNG CHÍNH THỨC:');
    console.log('👉 Tên đăng nhập: admin_BCH_doantruongdkhbt');
    console.log('👉 Mật khẩu:     DOANKETXUNGDANG2026@*');
    console.log('👉 Quyền hạn:    Admin Tổng (Toàn quyền)');
    console.log('================================================================');
  }

  console.log('🎉 Hệ thống đã được làm sạch 100%, sẵn sàng bàn giao chính thức!');
}

seedClean().catch(err => {
  console.error('Lỗi seed:', err);
  process.exit(1);
});
