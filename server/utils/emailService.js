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

/**
 * Generate 9-digit OTP for 2FA
 */
function generate9DigitOtp() {
  return Math.floor(100000000 + Math.random() * 900000000).toString();
}

/**
 * Branded Đoàn trường HTML template for 2FA OTP
 */
function getTwoFactorEmailTemplate({ otpCode, deviceInfo, recipientName }) {
  const brandTitle = 'ĐOÀN TRƯỜNG - HỆ THỐNG CONFIRM BUMP';
  const headerColor = '#DC2626';
  const subject = `[Đoàn Trường] Mã xác thực bảo mật 2FA (9 số): ${otpCode}`;

  const greeting = recipientName 
    ? `Xin chào đồng chí <b>${recipientName}</b>,` 
    : `Xin chào đồng chí,`;

  const formattedOtp = otpCode && otpCode.length === 9 
    ? `${otpCode.slice(0, 3)} ${otpCode.slice(3, 6)} ${otpCode.slice(6, 9)}` 
    : otpCode;

  const deviceName = deviceInfo?.device_name || 'Thiết bị không xác định';
  const ipAddress = deviceInfo?.ip_address || 'N/A';
  const timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

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
            <td style="background: linear-gradient(135deg, ${headerColor} 0%, #7f1d1d 100%); padding: 28px 24px; text-align: center;">
              <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background: #ffffff; color: #dc2626; font-size: 22px; font-weight: bold; margin-bottom: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                🔐
              </div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase;">
                ${brandTitle}
              </h1>
              <p style="margin: 6px 0 0; font-size: 12px; color: #fecaca; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                Xác Thực Đăng Nhập 2 Lớp (2FA)
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
                Hệ thống nhận được yêu cầu đăng nhập vào tài khoản của bạn với tính năng <b>Xác thực 2 lớp (2FA)</b> được kích hoạt.
              </p>

              <!-- Device Info Box -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
                <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
                  💻 Thông tin yêu cầu đăng nhập:
                </p>
                <table style="width: 100%; font-size: 13px; color: #334155; line-height: 1.5;">
                  <tr>
                    <td style="width: 90px; color: #64748b;">Thiết bị:</td>
                    <td><b>${deviceName}</b></td>
                  </tr>
                  <tr>
                    <td style="color: #64748b;">Địa chỉ IP:</td>
                    <td><code>${ipAddress}</code></td>
                  </tr>
                  <tr>
                    <td style="color: #64748b;">Thời gian:</td>
                    <td>${timeStr}</td>
                  </tr>
                </table>
              </div>

              <p style="margin: 16px 0 12px; font-size: 14px; line-height: 1.6; color: #475569;">
                Vui lòng nhập mã OTP bảo mật <b>9 chữ số</b> dưới đây vào màn hình xác thực để tiếp tục:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: #fef2f2; border: 2px dashed #dc2626; border-radius: 12px; padding: 18px 24px; display: inline-block; min-width: 260px;">
                      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #991b1b; letter-spacing: 1.5px; margin-bottom: 6px;">
                        MÃ XÁC THỰC 2FA (9 SỐ)
                      </div>
                      <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #dc2626; font-family: 'Courier New', Courier, monospace;">
                        ${formattedOtp}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Notice List -->
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 14px 16px; margin-top: 24px;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #92400e;">
                  ⚠️ Cảnh báo an ninh:
                </p>
                <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.6; color: #78350f;">
                  <li style="margin-bottom: 6px;">Mã xác thực có hiệu lực trong vòng <b>5 phút</b>.</li>
                  <li style="margin-bottom: 6px;">Tuyệt đối <b>không cung cấp mã này</b> cho bất kỳ ai, kể cả quản trị viên Đoàn trường.</li>
                  <li>Nếu bạn <b>không thực hiện</b> yêu cầu đăng nhập này, rất có thể tài khoản của bạn đang bị dò mật khẩu. Vui lòng đổi mật khẩu ngay lập tức!</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px 24px; border-top: 1px solid #f1f5f9; background-color: #fafafa; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">
                BAN CHẤP HÀNH ĐOÀN TRƯỜNG - HỆ THỐNG CONFIRM BUMP
              </p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8;">
                Bảo vệ tài khoản và tương tác mạng xã hội chính thức.
              </p>
              <p style="margin: 8px 0 0; font-size: 10.5px; color: #cbd5e1;">
                Thư tự động bảo mật 2 lớp, vui lòng không trả lời thư này.
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
 * Send 9-digit OTP for 2FA
 */
async function sendTwoFactorOtp(email, otpCode, deviceInfo = {}, recipientName = '') {
  console.log('====================================================');
  console.log('🔐 [MÃ XÁC MINH 2FA (9 SỐ) - ĐOÀN TRƯỜNG]');
  console.log(`➡️  Gửi đến Email: ${email}`);
  console.log(`🔑  Mã OTP 9 số:  ${otpCode}`);
  console.log(`💻  Thiết bị:     ${deviceInfo?.device_name || 'Không xác định'} (IP: ${deviceInfo?.ip_address || 'N/A'})`);
  console.log(`⏳  Thời hạn:     5 phút`);
  console.log('====================================================');

  const client = getTransporter();
  if (client) {
    try {
      const { subject, html } = getTwoFactorEmailTemplate({ otpCode, deviceInfo, recipientName });
      const fromName = process.env.SMTP_FROM_NAME || 'Đoàn Trường - Confirm Bump Bảo Mật';
      const sender = `"${fromName}" <${process.env.SMTP_USER}>`;

      await client.sendMail({
        from: sender,
        to: email,
        subject,
        html
      });
      console.log(`✅ Đã gửi email 2FA (9 số) thành công đến: ${email}`);
    } catch (mailErr) {
      console.warn(`⚠️ Không thể gửi mail 2FA qua SMTP (${mailErr.message}) - Sẽ hiển thị mã OTP trên giao diện/console.`);
    }
  } else {
    console.log('ℹ️ SMTP chưa được cấu hình, mã OTP 2FA được trả về/ghi nhận trong console.');
  }

  return { success: true, otpCode };
}

module.exports = {
  generateAndSendOtp,
  verifyOtp,
  generate9DigitOtp,
  sendTwoFactorOtp
};
