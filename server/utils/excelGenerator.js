const ExcelJS = require('exceljs');
const db = require('../config/db');

/**
 * Generate Excel workbook for confirm status
 * @param {number|null} departmentId - null for entire system, or specific department id
 */
async function generateConfirmExcel(departmentId = null) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Đoàn Trường - Hệ Thống Confirm Bump';
  workbook.lastModifiedBy = 'Admin';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Get departments to include
  let depts = [];
  if (departmentId) {
    const d = await db.get('SELECT * FROM departments WHERE id = ?', [departmentId]);
    if (d) depts = [d];
  } else {
    depts = await db.all('SELECT * FROM departments ORDER BY id ASC');
  }

  // Get all tasks
  const allTasks = await db.all('SELECT * FROM tasks ORDER BY created_at DESC');

  // Fetch all users with their statistics
  const allActiveUsers = await db.all(`
    SELECT u.id, u.username, u.full_name, u.email, u.facebook_url, u.role, u.department_id,
           d.name as department_name, d.code as department_code
    FROM users u
    JOIN departments d ON u.department_id = d.id
    WHERE u.status = 'ACTIVE'
    ORDER BY u.department_id ASC, u.full_name ASC
  `);

  // Calculate statistics per user
  const userStats = await Promise.all(allActiveUsers.map(async (user) => {
    const applicableTasks = allTasks.filter(t => !t.target_department_id || t.target_department_id === user.department_id);
    const totalAssigned = applicableTasks.length;

    const submissions = await db.all(`
      SELECT s.*, t.deadline, t.makeup_deadline
      FROM confirm_submissions s
      JOIN tasks t ON s.task_id = t.id
      WHERE s.user_id = ?
    `, [user.id]);

    let onTimeCount = 0;
    let makeupCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;

    submissions.forEach(s => {
      if (s.status === 'APPROVED') {
        if (s.is_makeup === 1) {
          makeupCount++;
        } else {
          onTimeCount++;
        }
      } else if (s.status === 'REJECTED') {
        rejectedCount++;
      } else if (s.status === 'PENDING') {
        pendingCount++;
      }
    });

    const totalCompleted = onTimeCount + makeupCount;
    const missingCount = Math.max(0, totalAssigned - totalCompleted - pendingCount);
    const completionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 100;

    return {
      ...user,
      totalAssigned,
      onTimeCount,
      makeupCount,
      pendingCount,
      rejectedCount,
      missingCount,
      completionRate
    };
  }));

  // If exporting entire system, create a Master Summary Sheet first
  if (!departmentId) {
    const summarySheet = workbook.addWorksheet('TỔNG HỢP TOÀN ĐOÀN', {
      views: [{ showGridLines: true }]
    });

    // Title banner
    summarySheet.mergeCells('A1:I1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'BÁO CÁO TỔNG HỢP TÌNH HÌNH BUMP BÀI TOÀN ĐOÀN TRƯỜNG';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC2626' }
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 40;

    summarySheet.mergeCells('A2:I2');
    const subCell = summarySheet.getCell('A2');
    subCell.value = `Thời gian xuất báo cáo: ${new Date().toLocaleString('vi-VN')} | Tổng số thành viên hoạt động: ${allActiveUsers.length}`;
    subCell.font = { italic: true, size: 11, color: { argb: 'FF475569' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(2).height = 24;

    const headers = [
      'STT', 'Tên Phân Ban', 'Số Lượng Thành Viên', 'Tổng Task Áp Dụng',
      'Hoàn Thành Đúng Hạn', 'Hoàn Thành Bù', 'Chờ Duyệt', 'Chưa Làm / Quá Hạn', 'Tỷ Lệ Hoàn Thành'
    ];
    const headerRow = summarySheet.addRow(headers);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1D4ED8' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    let stt = 1;
    depts.forEach(d => {
      const deptMembers = userStats.filter(u => u.department_id === d.id);
      const memberCount = deptMembers.length;
      const deptTasks = allTasks.filter(t => !t.target_department_id || t.target_department_id === d.id).length;
      const onTimeSum = deptMembers.reduce((acc, u) => acc + u.onTimeCount, 0);
      const makeupSum = deptMembers.reduce((acc, u) => acc + u.makeupCount, 0);
      const pendingSum = deptMembers.reduce((acc, u) => acc + u.pendingCount, 0);
      const missingSum = deptMembers.reduce((acc, u) => acc + u.missingCount, 0);
      const totalExpected = memberCount * deptTasks;
      const totalDone = onTimeSum + makeupSum;
      const rate = totalExpected > 0 ? Math.round((totalDone / totalExpected) * 100) : 100;

      const row = summarySheet.addRow([
        stt++,
        d.name,
        memberCount,
        deptTasks,
        onTimeSum,
        makeupSum,
        pendingSum,
        missingSum,
        `${rate}%`
      ]);
      row.height = 24;
      row.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: colNumber === 2 ? 'left' : 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    summarySheet.columns = [
      { width: 8 },
      { width: 25 },
      { width: 22 },
      { width: 20 },
      { width: 22 },
      { width: 18 },
      { width: 16 },
      { width: 22 },
      { width: 20 }
    ];
  }

  // Create sheet for each department
  depts.forEach(d => {
    const sheetName = d.name.toUpperCase().replace('BAN ', 'BAN ');
    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }]
    });

    sheet.mergeCells('A1:L1');
    const headerTitle = sheet.getCell('A1');
    headerTitle.value = `DANH SÁCH CHI TIẾT TÌNH TRẠNG CONFIRM BUMP - ${d.name.toUpperCase()}`;
    headerTitle.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    headerTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }
    };
    headerTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 36;

    sheet.mergeCells('A2:L2');
    const subTitle = sheet.getCell('A2');
    subTitle.value = `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} | Đơn vị: Đoàn Trường`;
    subTitle.font = { italic: true, size: 10, color: { argb: 'FF475569' } };
    subTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 22;

    const memberHeaders = [
      'STT', 'Mã TV', 'Họ Và Tên', 'Tài Khoản', 'Vai Trò', 'Email', 'Link Facebook',
      'Tổng Task', 'Đúng Hạn', 'Nộp Bù (3 ngày)', 'Chưa Nộp / Quá Hạn', 'Tỷ Lệ Hoàn Thành'
    ];
    const mHeaderRow = sheet.addRow(memberHeaders);
    mHeaderRow.height = 28;
    mHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    const deptUsers = userStats.filter(u => u.department_id === d.id);
    let memberIndex = 1;
    deptUsers.forEach(u => {
      const roleText = u.role === 'ADMIN_CAP_2' ? 'Admin Ban (Cấp 2)' : (u.role === 'ADMIN_TONG' ? 'Admin Tổng' : 'Thành viên');
      const row = sheet.addRow([
        memberIndex++,
        `TV-${u.id.toString().padStart(3, '0')}`,
        u.full_name,
        u.username,
        roleText,
        u.email,
        u.facebook_url,
        u.totalAssigned,
        u.onTimeCount,
        u.makeupCount,
        u.missingCount,
        `${u.completionRate}%`
      ]);
      row.height = 24;

      row.eachCell((cell, colNumber) => {
        cell.alignment = { 
          horizontal: [3, 4, 6, 7].includes(colNumber) ? 'left' : 'center', 
          vertical: 'middle' 
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        if (colNumber === 12) {
          if (u.completionRate >= 80) {
            cell.font = { bold: true, color: { argb: 'FF16A34A' } };
          } else if (u.completionRate >= 50) {
            cell.font = { bold: true, color: { argb: 'FFD97706' } };
          } else {
            cell.font = { bold: true, color: { argb: 'FFDC2626' } };
          }
        }
      });
    });

    sheet.columns = [
      { width: 8 },
      { width: 12 },
      { width: 24 },
      { width: 16 },
      { width: 18 },
      { width: 26 },
      { width: 35 },
      { width: 14 },
      { width: 14 },
      { width: 18 },
      { width: 20 },
      { width: 20 }
    ];
  });

  return workbook;
}

module.exports = {
  generateConfirmExcel
};
