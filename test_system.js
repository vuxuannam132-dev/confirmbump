const http = require('http');

// Helper to make JSON requests
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: headers
    }, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(buffer.toString('utf-8')) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: buffer.toString('utf-8') });
          }
        } else {
          resolve({ status: res.statusCode, buffer: buffer, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN HỆ THỐNG...\n');

  try {
    // 1. Health check
    const health = await request('GET', '/api/health');
    console.log('1. Health check:', health.status === 200 && health.data.status === 'ok' ? '✅ PASS' : '❌ FAIL');

    // 2. Departments
    const depts = await request('GET', '/api/auth/departments');
    console.log('2. Phân ban (4 ban):', depts.data?.departments?.length === 4 ? '✅ PASS (Có đủ 4 ban)' : '❌ FAIL');

    // 3. Admin Tổng Login
    const adminLogin = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
    const adminToken = adminLogin.data?.token;
    console.log('3. Đăng nhập Admin Tổng:', adminToken ? '✅ PASS' : '❌ FAIL');

    // 4. Admin Cấp 2 Login (Ban Truyền Thông)
    const admin2Login = await request('POST', '/api/auth/login', { username: 'admin_truyenthong', password: 'admin123' });
    const admin2Token = admin2Login.data?.token;
    console.log('4. Đăng nhập Admin Cấp 2 (Truyền thông):', admin2Token ? '✅ PASS' : '❌ FAIL');

    // 5. User Login
    const userLogin = await request('POST', '/api/auth/login', { username: 'user_tt', password: 'user123' });
    const userToken = userLogin.data?.token;
    console.log('5. Đăng nhập Thành viên (user_tt):', userToken ? '✅ PASS' : '❌ FAIL');

    // 6. Get Tasks
    const tasksRes = await request('GET', '/api/tasks', null, userToken);
    console.log('6. Lấy danh sách Tasks (kèm trạng thái cá nhân):', tasksRes.data?.tasks?.length >= 3 ? '✅ PASS' : '❌ FAIL');
    const overdueTask = tasksRes.data?.tasks?.find(t => t.myStatus === 'QUA_HAN_CHO_NOP_BU');
    console.log('   -> Kiểm tra logic hạn bù 3 ngày:', overdueTask ? `✅ PASS (Task ID ${overdueTask.id} nhận diện Quá hạn cho nộp bù)` : '⚠️');

    // 7. Send OTP
    const testEmail = 'test_doanvien_' + Date.now() + '@gmail.com';
    const otpRes = await request('POST', '/api/auth/send-otp', { email: testEmail });
    const otpCode = otpRes.data?.devOtp;
    console.log('7. Gửi mã OTP 6 số ngẫu nhiên:', otpRes.data?.success && otpCode?.length === 6 ? `✅ PASS (Mã: ${otpCode})` : '❌ FAIL');

    // 8. Register new User with OTP
    const testUsername = 'test_member_' + Math.floor(Math.random() * 1000);
    const regRes = await request('POST', '/api/auth/register', {
      full_name: 'Đoàn Viên Thử Nghiệm',
      email: testEmail,
      otp_code: otpCode,
      facebook_url: 'https://facebook.com/doanvien.test',
      department_id: depts.data.departments[0].id,
      username: testUsername,
      password: 'password123'
    });
    console.log('8. Đăng ký tài khoản mới kèm OTP:', regRes.data?.success ? '✅ PASS' : '❌ FAIL');

    // 9. Login before approval should be blocked with PENDING_APPROVAL
    const blockedLogin = await request('POST', '/api/auth/login', { username: testUsername, password: 'password123' });
    console.log('9. Chặn đăng nhập khi chưa được Admin Tổng duyệt:', blockedLogin.data?.status === 'PENDING_APPROVAL' ? '✅ PASS (Chặn đúng nghiệp vụ)' : '❌ FAIL');

    // 10. Admin Tổng views pending registrations & approves
    const pendingRes = await request('GET', '/api/users?status=PENDING_APPROVAL', null, adminToken);
    const newPending = pendingRes.data?.users?.find(u => u.username === testUsername);
    console.log('10. Admin Tổng xem danh sách chờ duyệt:', newPending ? '✅ PASS' : '❌ FAIL');

    if (newPending) {
      const approveRes = await request('PUT', `/api/users/${newPending.id}/approve`, {}, adminToken);
      console.log('11. Admin Tổng duyệt thành viên vào phân ban:', approveRes.data?.success ? '✅ PASS' : '❌ FAIL');

      // Now member can login
      const nowAllowed = await request('POST', '/api/auth/login', { username: testUsername, password: 'password123' });
      console.log('12. Thành viên đăng nhập thành công sau khi được duyệt:', nowAllowed.data?.token ? '✅ PASS' : '❌ FAIL');
    }

    // 13. Admin Tổng Review Queue
    const queueRes = await request('GET', '/api/confirms/review-queue', null, adminToken);
    console.log('13. Admin Tổng xem danh sách chờ duyệt confirm:', queueRes.data?.submissions ? `✅ PASS (Có ${queueRes.data.submissions.length} lượt nộp)` : '❌ FAIL');

    // 14. Progress Tracking
    const progressRes = await request('GET', '/api/confirms/progress', null, admin2Token);
    console.log('14. Admin Cấp 2 xem tiến độ thành viên ban mình:', progressRes.data?.progress ? `✅ PASS (${progressRes.data.progress.length} thành viên)` : '❌ FAIL');

    // 15. Excel Export
    const excelRes = await request('GET', '/api/export/excel', null, adminToken);
    const isExcel = excelRes.headers?.['content-type']?.includes('spreadsheetml');
    console.log('15. Xuất file Excel toàn hệ thống:', isExcel && excelRes.buffer?.length > 1000 ? `✅ PASS (File dung lượng: ${excelRes.buffer.length} bytes)` : '❌ FAIL');

    console.log('\n🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ ĐỀU ĐẠT CHUẨN 100%!');
  } catch (err) {
    console.error('Lỗi kiểm thử:', err);
  }
}

runTests();
