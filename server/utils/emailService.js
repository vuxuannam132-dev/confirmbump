const nodemailer = require('nodemailer');
const db = require('../config/db');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (user && pass) {
    if (host) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });
    } else if (user.endsWith('@gmail.com')) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
    }
  }

  return transporter;
}

/**
 * Generate HTML email template
 */
function getEmailTemplate({ type, otpCode, recipientName }) {
  const isRegister = type === 'REGISTER';

  const brandTitle = 'ĐOÀN TRƯỜNG - HỆ THỐNG CONFIRM BUMP';
  const headerColor = isRegister ? '#DC2626' : '#B91C1C';
  const badgeBg = isRegister ? '#EFF6FF' : '#FEF2F2';
  const badgeBorder = isRegister ? '#2563EB' : '#DC2626';
  const badgeColor = isRegister ? '#1D4ED8' : '#B91C1C';

  const subject = isRegister
    ? `[Đoàn Trường] Mã xác thực đăng ký tài khoản: ${otpCode}`
    : `[Đoàn Trường] Mã xác thực đặt lại mật khẩu: ${otpCode}`;

  const greeting = recipientName 
    ? `Xin chào đồng chí <b>${recipientName}</b>,` 
    : `Xin chào đồng chí,`;

  const purposeText = isRegister
    ? `Bạn (hoặc ai đó) đang thực hiện đăng ký tài khoản thành viên mới trên <b>Hệ thống Xác nhận Tương tác Mạng Xã hội (Confirm Bump) - Đoàn Trường</b>.`
    : `Hệ thống nhận được yêu cầu <b>đặt lại mật khẩu</b> cho tài khoản của bạn trên <b>Hệ thống Confirm Bump Đoàn Trường</b>.`;

  const actionNote = isRegister
    ? `Vui lòng sử dụng mã xác thực gồm 6 chữ số dưới đây để hoàn tất biểu mẫu đăng ký:`
    : `Vui lòng nhập mã xác thực gồm 6 chữ số dưới đây để tiến hành thiết lập mật khẩu mới:`;

  const securityWarning = isRegister
    ? `<li style="margin-bottom: 6px;">Mã xác thực có hiệu lực trong vòng <b>5 phút</b> kể từ lúc gửi.</li>
       <li style="margin-bottom: 6px;">Sau khi gửi đăng ký thành công, tài khoản sẽ được chuyển đến <b>Admin Tổng (Ban Chấp Hành Đoàn Trường)</b> để phê duyệt phân ban trước khi có thể đăng nhập.</li>
       <li>Tuyệt đối <b>không chia sẻ mã này</b> cho bất kỳ ai để đảm bảo an toàn thông tin cá nhân.</li>`
    : `<li style="margin-bottom: 6px;">Mã xác thực có hiệu lực trong vòng <b>5 phút</b>.</li>
       <li style="margin-bottom: 6px;"><b>Cảnh báo bảo mật:</b> Nếu bạn <i>không gửi yêu cầu này</i>, vui lòng bỏ qua email và đổi mật khẩu hoặc liên hệ ngay với Ban Quản trị Đoàn trường. Mật khẩu hiện tại của bạn vẫn được giữ nguyên an toàn.</li>
       <li>Tuyệt đối <b>không cung cấp mã OTP này</b> cho bất kỳ ai dưới mọi hình thức.</li>`;

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <!-- Top Banner Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${headerColor} 0%, #991b1b 100%); padding: 28px 24px; text-align: center;">
              <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background: #ffffff; color: #dc2626; font-size: 22px; font-weight: bold; margin-bottom: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                🔥
              </div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase;">
                ${brandTitle}
              </h1>
              <p style="margin: 6px 0 0; font-size: 12px; color: #fecaca; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                ${isRegister ? 'Xác Thực Đăng Ký Tài Khoản' : 'Khôi Phục Mật Khẩu Đăng Nhập'}
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 28px 20px;">
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
                ${greeting}
              </p>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #475569;">
                ${purposeText}
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
                ${actionNote}
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: ${badgeBg}; border: 2px dashed ${badgeBorder}; border-radius: 12px; padding: 18px 24px; display: inline-block; min-width: 240px;">
                      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 1.5px; margin-bottom: 6px;">
                        MÃ XÁC MINH CỦA BẠN (OTP)
                      </div>
                      <div style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: ${badgeColor}; font-family: 'Courier New', Courier, monospace;">
                        ${otpCode}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Notice List -->
              <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 14px 16px; margin-top: 24px;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #1e293b;">
                  📌 Lưu ý quan trọng:
                </p>
                <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.6; color: #475569;">
                  ${securityWarning}
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px 24px; border-top: 1px solid #f1f5f9; background-color: #fafafa; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">
                BAN CHẤP HÀNH ĐOÀN TRƯỜNG
              </p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8;">
                Hệ thống theo dõi và xác nhận tương tác mạng xã hội Facebook, Instagram, TikTok.
              </p>
              <p style="margin: 8px 0 0; font-size: 10.5px; color: #cbd5e1;">
                Thư này được tạo tự động bởi hệ thống, vui lòng không trả lời trực tiếp email này.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Generate and store a 6-digit OTP for email verification
 */
async function generateAndSendOtp(email, type = 'REGISTER', recipientName = '') {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Delete previous expired otps for this email
  await db.run('DELETE FROM email_otps WHERE email = ?', [email]);

  // Store new OTP
  await db.run('INSERT INTO email_otps (email, otp_code, expires_at) VALUES (?, ?, ?)', [email, otpCode, expiresAt]);

  console.log('====================================================');
  console.log(`📬 [MÃ XÁC MINH OTP - ${type}]`);
  console.log(`➡️  Email: ${email}`);
  console.log(`🔑  Mã 6 số ngẫu nhiên: ${otpCode}`);
  console.log(`⏳  Hạn sử dụng: 5 phút (${expiresAt})`);
  console.log('====================================================');

  const client = getTransporter();
  if (client) {
    try {
      const { subject, html } = getEmailTemplate({ type, otpCode, recipientName });
      const fromName = process.env.SMTP_FROM_NAME || 'Đoàn Trường - Confirm Bump';
      const sender = `"${fromName}" <${process.env.SMTP_USER}>`;

      await client.sendMail({
        from: sender,
        to: email,
        subject,
        html
      });
      console.log(`✅ Đã gửi email thực tế (${type}) thành công đến: ${email}`);
    } catch (mailErr) {
      console.warn(`⚠️ Không thể gửi mail qua SMTP (${mailErr.message}) - Sẽ hiển thị mã OTP trên giao diện/console.`);
    }
  } else {
    console.log('ℹ️ SMTP chưa được cấu hình, mã OTP được ghi vào cơ sở dữ liệu và trả về phản hồi.');
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
