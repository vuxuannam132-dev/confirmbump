const nodemailer = require('nodemailer');
const db = require('../config/db');

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * Generate and store a 6-digit OTP for email verification
 */
async function generateAndSendOtp(email) {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Delete previous expired otps for this email
  await db.run('DELETE FROM email_otps WHERE email = ?', [email]);

  // Store new OTP
  await db.run('INSERT INTO email_otps (email, otp_code, expires_at) VALUES (?, ?, ?)', [email, otpCode, expiresAt]);

  console.log('====================================================');
  console.log(`📬 [MÃ XÁC MINH OTP]`);
  console.log(`➡️  Email: ${email}`);
  console.log(`🔑  Mã 6 số ngẫu nhiên: ${otpCode}`);
  console.log(`⏳  Hạn sử dụng: 5 phút (${expiresAt})`);
  console.log('====================================================');

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"Đoàn Trường - Hệ Thống Confirm Bump" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `[Đoàn Trường] Mã xác thực đăng ký tài khoản: ${otpCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #dc2626; text-align: center;">ĐOÀN TRƯỜNG - HỆ THỐNG CONFIRM BUMP</h2>
            <p>Xin chào bạn,</p>
            <p>Bạn đang thực hiện đăng ký tài khoản thành viên trên hệ thống. Dưới đây là mã xác thực (OTP) của bạn:</p>
            <div style="text-align: center; margin: 25px 0;">
              <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb; background: #eff6ff; padding: 10px 24px; border-radius: 8px; border: 1px dashed #2563eb;">
                ${otpCode}
              </span>
            </div>
            <p style="color: #64748b; font-size: 14px;">Mã này có hiệu lực trong vòng <b>5 phút</b>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">Hệ thống theo dõi và xác nhận tương tác mạng xã hội Đoàn trường.</p>
          </div>
        `
      });
      console.log(`✅ Đã gửi email thực tế đến: ${email}`);
    } catch (mailErr) {
      console.warn(`⚠️ Không thể gửi mail qua SMTP (sẽ dùng mã in tại console):`, mailErr.message);
    }
  }

  return { success: true, otpCode };
}

/**
 * Verify OTP
 */
async function verifyOtp(email, inputCode) {
  if (!email || !inputCode) return false;

  const record = await db.get(`
    SELECT * FROM email_otps 
    WHERE email = ? AND otp_code = ? 
    ORDER BY id DESC LIMIT 1
  `, [email.trim().toLowerCase(), inputCode.trim()]);

  if (!record) return false;

  const isExpired = new Date(record.expires_at).getTime() < Date.now();
  if (isExpired) return false;

  // Clean up used OTP
  await db.run('DELETE FROM email_otps WHERE email = ?', [email]);
  return true;
}

module.exports = {
  generateAndSendOtp,
  verifyOtp
};
