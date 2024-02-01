const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer configuration for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/images', 'product');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    if (!file) {
        console.log('No file provided');
          // No file provided, proceed without an image name
          cb(null, '');

    } else {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  },
  fileFilter: (req, file, cb) => {
    // Define your expected field names here
    const expectedFieldNames = ['productImages'];

    // Check if the received field name is expected
    if (expectedFieldNames.includes(file.fieldname)) {
        cb(null, true); // Accept the file
    } else {
        cb(new Error('Unexpected field'), false); // Reject the file
    }
},
});

const upload = multer({ storage: storage });

module.exports = upload.array('productImages', 5);