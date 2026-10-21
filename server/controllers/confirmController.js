const path = require('path');
const fs = require('fs');
const db = require('../config/db');

// Helper to normalize submission images (supports both legacy single URL and new multi-image JSON array)
function formatSubmission(sub) {
  if (!sub) return sub;
  let imageUrls = [];
  if (sub.image_url) {
    const raw = (typeof sub.image_url === 'string') ? sub.image_url.trim() : '';
    if (raw.startsWith('[') && raw.endsWith(']')) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          imageUrls = parsed;
        } else {
          imageUrls = [raw];
        }
      } catch (e) {
        imageUrls = [raw];
      }
    } else if (raw) {
      imageUrls = [raw];
    }
  }

  return {
    ...sub,
    image_url: imageUrls[0] || sub.image_url || '',
    image_urls: imageUrls
  };
}

// Helper to store image depending on environment
async function processUploadedImage(file) {
  // Option 1: If IMGBB_API_KEY is configured, upload to ImgBB cloud storage
  if (process.env.IMGBB_API_KEY) {
    try {
      const base64Data = file.buffer.toString('base64');
      const formData = new URLSearchParams();
      formData.append('image', base64Data);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      const resData = await response.json();
      if (resData.success && resData.data && resData.data.url) {
        return resData.data.url;
      }
    } catch (imgErr) {
      console.warn('⚠️ Lỗi upload ImgBB, chuyển sang phương án dự phòng:', imgErr.message);
    }
  }

  // Option 2: If running locally and not on Vercel, save to disk
  if (!process.env.VERCEL) {
    try {
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const filename = 'confirm-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
      const fullPath = path.join(uploadsDir, filename);
      fs.writeFileSync(fullPath, file.buffer);
      return `/uploads/${filename}`;
    } catch (fsErr) {
      console.warn('⚠️ Lỗi ghi file cục bộ, dùng base64:', fsErr.message);
    }
  }

  // Option 3: Fallback Base64 Data URL (Works 100% on Vercel without any external service!)
  return `data:${file.mimetype || 'image/jpeg'};base64,${file.buffer.toString('base64')}`;
}

// POST /api/confirms/submit
async function submitConfirm(req, res) {
  try {
    const { task_id, note } = req.body;
    const currentUser = req.user;

    if (!task_id) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã task.' });
    }

    // Extract all uploaded files (supports both multiple 'images' and single 'image')
    let files = [];
    if (req.files) {
      if (Array.isArray(req.files)) {
        files = req.files;
      } else if (req.files.images) {
        files = req.files.images;
      } else if (req.files.image) {
        files = req.files.image;
      }
    } else if (req.file) {
      files = [req.file];
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất 1 ảnh chụp màn hình bằng chứng bump bài!' });
    }

    if (files.length > 10) {
      return res.status(400).json({ success: false, message: 'Hệ thống hỗ trợ tối đa 10 ảnh minh chứng cho một bài viết.' });
    }

    const task = await db.get('SELECT * FROM tasks WHERE id = ?', [task_id]);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task không tồn tại hoặc đã bị xóa.' });
    }

    const now = new Date();
    const deadline = new Date(task.deadline);
    const makeupDeadline = new Date(task.makeup_deadline);

    let isMakeup = 0;
    if (now <= deadline) {
      isMakeup = 0;
    } else if (now <= makeupDeadline) {
      isMakeup = 1;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Task này đã quá thời hạn 3 ngày cho phép nộp bù. Hệ thống đã khóa nộp minh chứng!'
      });
    }

    // Process all images concurrently
    const imageUrls = await Promise.all(files.map(f => processUploadedImage(f)));
    const storedImageUrl = JSON.stringify(imageUrls);

    // Check if user already submitted
    const existing = await db.get('SELECT id FROM confirm_submissions WHERE task_id = ? AND user_id = ?', [task_id, currentUser.id]);

    if (existing) {
      await db.run(`
        UPDATE confirm_submissions
        SET image_url = ?, note = ?, is_makeup = ?, status = 'PENDING', admin_feedback = NULL,
            reviewed_by = NULL, reviewed_at = NULL, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [storedImageUrl, (note || '').trim(), isMakeup, existing.id]);

      return res.json({
        success: true,
        message: isMakeup === 1 
          ? `Nộp lại ${imageUrls.length} ảnh minh chứng (Nộp bù) thành công! Đang chờ Admin Tổng phê duyệt.` 
          : `Nộp lại ${imageUrls.length} ảnh minh chứng thành công! Đang chờ Admin Tổng phê duyệt.`,
        submissionId: existing.id
      });
    } else {
      const result = await db.run(`
        INSERT INTO confirm_submissions (task_id, user_id, image_url, note, is_makeup, status)
        VALUES (?, ?, ?, ?, ?, 'PENDING')
      `, [task_id, currentUser.id, storedImageUrl, (note || '').trim(), isMakeup]);

      return res.status(201).json({
        success: true,
        message: isMakeup === 1 
          ? `Gửi ${imageUrls.length} ảnh minh chứng nộp bù thành công! Đang chờ Admin Tổng phê duyệt.` 
          : `Gửi ${imageUrls.length} ảnh minh chứng thành công! Đang chờ Admin Tổng phê duyệt.`,
        submissionId: result.lastInsertRowid
      });
    }
  } catch (error) {
    console.error('Error in submitConfirm:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// GET /api/confirms/review-queue (Only Admin Tổng)
async function getReviewQueue(req, res) {
  try {
    const { department_id, task_id, status, search } = req.query;

    let query = `
      SELECT s.*, 
             u.full_name, u.username, u.email, u.facebook_url, u.role as user_role,
             d.name as department_name, d.code as department_code, d.color as department_color,
             t.title as task_title, t.platform as task_platform, t.post_url as task_post_url,
             t.deadline as task_deadline, t.makeup_deadline as task_makeup_deadline,
             r.full_name as reviewer_name
      FROM confirm_submissions s
      JOIN users u ON s.user_id = u.id
      JOIN departments d ON u.department_id = d.id
      JOIN tasks t ON s.task_id = t.id
      LEFT JOIN users r ON s.reviewed_by = r.id
      WHERE 1=1
    `;
    const params = [];

    if (department_id) {
      query += ` AND u.department_id = ? `;
      params.push(department_id);
    }

    if (task_id) {
      query += ` AND s.task_id = ? `;
      params.push(task_id);
    }

    if (status && status !== 'ALL') {
      query += ` AND s.status = ? `;
      params.push(status);
    }

    if (search && search.trim() !== '') {
      query += ` AND (LOWER(u.full_name) LIKE ? OR LOWER(u.username) LIKE ? OR LOWER(t.title) LIKE ?) `;
      const s = `%${search.trim().toLowerCase()}%`;
      params.push(s, s, s);
    }

    query += ` ORDER BY CASE WHEN s.status = 'PENDING' THEN 1 ELSE 2 END, s.submitted_at DESC `;

    const submissions = await db.all(query, params);
    return res.json({ success: true, submissions: submissions.map(formatSubmission) });
  } catch (error) {
    console.error('Error in getReviewQueue:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// PUT /api/confirms/:id/review (Only Admin Tổng)
async function reviewConfirm(req, res) {
  try {
    const confirmId = req.params.id;
    const { status, admin_feedback } = req.body;
    const currentUser = req.user;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái duyệt phải là APPROVED hoặc REJECTED.' });
    }

    const sub = await db.get('SELECT id FROM confirm_submissions WHERE id = ?', [confirmId]);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lượt nộp confirm.' });
    }

    await db.run(`
      UPDATE confirm_submissions
      SET status = ?, admin_feedback = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, (admin_feedback || '').trim(), currentUser.id, confirmId]);

    return res.json({
      success: true,
      message: status === 'APPROVED' ? 'Đã duyệt chấp nhận bằng chứng!' : 'Đã từ chối bằng chứng và gửi phản hồi!'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// GET /api/confirms/my-history
async function getMyHistory(req, res) {
  try {
    const currentUser = req.user;

    const query = `
      SELECT s.*, 
             t.title as task_title, t.platform as task_platform, t.post_url as task_post_url,
             t.deadline as task_deadline, t.makeup_deadline as task_makeup_deadline,
             r.full_name as reviewer_name
      FROM confirm_submissions s
      JOIN tasks t ON s.task_id = t.id
      LEFT JOIN users r ON s.reviewed_by = r.id
      WHERE s.user_id = ?
      ORDER BY s.submitted_at DESC
    `;
    const history = await db.all(query, [currentUser.id]);
    return res.json({ success: true, history: history.map(formatSubmission) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// GET /api/confirms/progress (For Admin Cấp 2 and Admin Tổng)
async function getProgress(req, res) {
  try {
    const currentUser = req.user;
    const { department_id, search } = req.query;

    let targetDeptId = null;
    if (currentUser.role === 'ADMIN_CAP_2') {
      targetDeptId = currentUser.department_id;
    } else if (department_id) {
      targetDeptId = department_id;
    }

    let usersQuery = `
      SELECT u.id, u.username, u.full_name, u.email, u.facebook_url, u.role, u.department_id,
             d.name as department_name, d.code as department_code, d.color as department_color
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.status = 'ACTIVE'
    `;
    const uParams = [];

    if (targetDeptId) {
      usersQuery += ` AND u.department_id = ? `;
      uParams.push(targetDeptId);
    }

    if (search && search.trim() !== '') {
      usersQuery += ` AND (LOWER(u.full_name) LIKE ? OR LOWER(u.username) LIKE ?) `;
      const s = `%${search.trim().toLowerCase()}%`;
      uParams.push(s, s);
    }

    usersQuery += ` ORDER BY u.department_id ASC, u.full_name ASC `;
    const users = await db.all(usersQuery, uParams);

    const allTasks = await db.all('SELECT * FROM tasks ORDER BY created_at DESC');

    const userStats = await Promise.all(users.map(async (user) => {
      const applicableTasks = allTasks.filter(t => !t.target_department_id || t.target_department_id === user.department_id);
      
      const submissions = await db.all(`
        SELECT s.*, t.title as task_title, t.deadline, t.makeup_deadline
        FROM confirm_submissions s
        JOIN tasks t ON s.task_id = t.id
        WHERE s.user_id = ?
      `, [user.id]);

      const formattedSubmissions = submissions.map(formatSubmission);

      const approvedOnTime = formattedSubmissions.filter(s => s.status === 'APPROVED' && s.is_makeup === 0).length;
      const approvedMakeup = formattedSubmissions.filter(s => s.status === 'APPROVED' && s.is_makeup === 1).length;
      const pendingCount = formattedSubmissions.filter(s => s.status === 'PENDING').length;
      const rejectedCount = formattedSubmissions.filter(s => s.status === 'REJECTED').length;

      const totalCompleted = approvedOnTime + approvedMakeup;
      const missingCount = Math.max(0, applicableTasks.length - totalCompleted - pendingCount);
      const completionRate = applicableTasks.length > 0 ? Math.round((totalCompleted / applicableTasks.length) * 100) : 100;

      return {
        user,
        totalTasks: applicableTasks.length,
        approvedOnTime,
        approvedMakeup,
        pendingCount,
        rejectedCount,
        missingCount,
        completionRate,
        submissions: formattedSubmissions
      };
    }));

    return res.json({ success: true, progress: userStats });
  } catch (error) {
    console.error('Error in getProgress:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  formatSubmission,
  submitConfirm,
  getReviewQueue,
  reviewConfirm,
  getMyHistory,
  getProgress
};
