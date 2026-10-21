const { generateConfirmExcel } = require('../utils/excelGenerator');
const db = require('../config/db');

// GET /api/export/excel
async function exportExcel(req, res) {
  try {
    const currentUser = req.user;
    let { department_id } = req.query;

    let targetDeptId = null;
    let fileNameDept = 'Toan-Doan';

    if (currentUser.role === 'ADMIN_CAP_2') {
      targetDeptId = currentUser.department_id;
      const dept = db.prepare('SELECT code FROM departments WHERE id = ?').get(targetDeptId);
      fileNameDept = dept ? dept.code : 'Phan-Ban';
    } else if (department_id) {
      targetDeptId = parseInt(department_id);
      const dept = db.prepare('SELECT code FROM departments WHERE id = ?').get(targetDeptId);
      fileNameDept = dept ? dept.code : 'Phan-Ban';
    }

    const workbook = await generateConfirmExcel(targetDeptId);

    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `Bao-Cao-Confirm-Bump-${fileNameDept}-${timestamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel export:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi xuất file Excel: ' + error.message });
  }
}

module.exports = {
  exportExcel
};
