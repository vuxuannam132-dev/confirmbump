const multer = require('multer');
const path = require('path');

// Use memoryStorage for full compatibility with Vercel Serverless & Cloud storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mimetype = allowed.test(file.mimetype);

  if (mimetype || allowed.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận tệp hình ảnh (JPG, PNG, WEBP, GIF)!'), false);
  }
};

const upload = multer({
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10                   // Up to 10 files per request
  },
  fileFilter
});

module.exports = upload;
