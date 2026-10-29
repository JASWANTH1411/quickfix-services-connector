const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = [
  path.join(__dirname, '../uploads/profile'),
  path.join(__dirname, '../uploads/documents'),
  path.join(__dirname, '../uploads/work_photos'),
  path.join(__dirname, '../uploads/categories'),
  path.join(__dirname, '../uploads/services')
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'avatar' || file.fieldname === 'profile_photo') {
      cb(null, path.join(__dirname, '../uploads/profile'));
    } else if (['aadhaar', 'pan', 'driving_license', 'certificates'].includes(file.fieldname)) {
      cb(null, path.join(__dirname, '../uploads/documents'));
    } else if (file.fieldname === 'work_photo' || file.fieldname === 'problem_images') {
      cb(null, path.join(__dirname, '../uploads/work_photos'));
    } else {
      cb(null, path.join(__dirname, '../uploads'));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|pdf/;
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype);

  if (extName && mimeType) {
    return cb(null, true);
  }
  cb(new Error('File upload format unsupported. Allowed: JPEG, JPG, PNG, WEBP, PDF'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

module.exports = upload;
