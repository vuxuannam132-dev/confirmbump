const db = require('../config/db');

// POST /api/tasks (Only Admin Tổng)
async function createTask(req, res) {
  try {
    const { title, description, platform, post_url, target_department_id, deadline } = req.body;
    const currentUser = req.user;

    if (!title || !platform || !post_url || !deadline) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tiêu đề, nền tảng, đường link bài viết và thời hạn hết hạn.' });
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Thời hạn không hợp lệ.' });
    }

    const makeupDeadline = new Date(deadlineDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const finalDeadline = deadlineDate.toISOString();
    const deptId = target_department_id ? parseInt(target_department_id) : null;

    const result = await db.run(`
      INSERT INTO tasks (title, description, platform, post_url, target_department_id, created_by, deadline, makeup_deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title.trim(),
      (description || '').trim(),
      platform.toUpperCase(),
      post_url.trim(),
      deptId,
      currentUser.id,
      finalDeadline,
      makeupDeadline
    ]);

    return res.status(201).json({
      success: true,
      message: 'Đăng task confirm mới thành công!',
      taskId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error in createTask:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// GET /api/tasks
async function getTasks(req, res) {
  try {
    const currentUser = req.user;
    const now = new Date();

    let query = `
      SELECT t.*, d.name as target_department_name, d.code as target_department_code,
             u.full_name as creator_name
      FROM tasks t
      LEFT JOIN departments d ON t.target_department_id = d.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (currentUser.role !== 'ADMIN_TONG' && currentUser.department_id) {
      query += ` AND (t.target_department_id IS NULL OR t.target_department_id = ?) `;
      params.push(currentUser.department_id);
    }

    query += ` ORDER BY t.created_at DESC `;

    const tasks = await db.all(query, params);

    // Attach user submission status to each task
    const tasksWithStatus = await Promise.all(tasks.map(async (task) => {
      const sub = await db.get(`
        SELECT * FROM confirm_submissions 
        WHERE task_id = ? AND user_id = ?
        ORDER BY id DESC LIMIT 1
      `, [task.id, currentUser.id]);

      const deadline = new Date(task.deadline);
      const makeupDeadline = new Date(task.makeup_deadline);

      let status = 'CHUA_NOP';
      let canSubmit = true;
      let isMakeupPeriod = false;

      if (sub) {
        if (sub.status === 'APPROVED') {
          status = sub.is_makeup === 1 ? 'HOAN_THANH_BU' : 'DA_HOAN_THANH';
          canSubmit = false;
        } else if (sub.status === 'PENDING') {
          status = 'CHO_DUYET';
          canSubmit = false;
        } else if (sub.status === 'REJECTED') {
          status = 'BI_TU_CHOI';
          if (now <= makeupDeadline) {
            canSubmit = true;
            isMakeupPeriod = now > deadline;
          } else {
            canSubmit = false;
          }
        }
      } else {
        if (now <= deadline) {
          status = 'CHUA_NOP';
          canSubmit = true;
          isMakeupPeriod = false;
        } else if (now <= makeupDeadline) {
          status = 'QUA_HAN_CHO_NOP_BU';
          canSubmit = true;
          isMakeupPeriod = true;
        } else {
          status = 'QUA_HAN_DA_DONG';
          canSubmit = false;
          isMakeupPeriod = false;
        }
      }

      const stats = await db.get(`
        SELECT 
          COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved_count,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_count
        FROM confirm_submissions
        WHERE task_id = ?
      `, [task.id]);

      return {
        ...task,
        mySubmission: sub || null,
        myStatus: status,
        canSubmit,
        isMakeupPeriod,
        approvedCount: parseInt(stats?.approved_count || 0),
        pendingCount: parseInt(stats?.pending_count || 0)
      };
    }));

    return res.json({ success: true, tasks: tasksWithStatus });
  } catch (error) {
    console.error('Error in getTasks:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// DELETE /api/tasks/:id (Only Admin Tổng)
async function deleteTask(req, res) {
  try {
    const taskId = req.params.id;
    const task = await db.get('SELECT id FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy task cần xóa.' });
    }

    await db.run('DELETE FROM tasks WHERE id = ?', [taskId]);
    return res.json({ success: true, message: 'Đã xóa task thành công.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createTask,
  getTasks,
  deleteTask
};
