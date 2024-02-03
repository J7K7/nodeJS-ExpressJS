const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer configuration for handling file uploads
const storage = multer.diskStorage({

  destination: function (req, file, cb) {
    // console.log(req.body.imagesLength )
    const uploadPath = path.join(__dirname, '../public/images', 'product');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  fileFilter: (req, file, cb) => {
    // Currntly this validation are not Workings remaining for future
    //this function is not working no size or file upload type validation are added 


    console.log("filefilter")
    const expectedFieldNames = ['productImages'];
    const maxFileSize =  10 * 1024 * 1024; // 10MB
    const allowedFileTypes = ['image/jpeg', 'image/png','image/jpg'];
  
    if (!expectedFieldNames.includes(file.fieldname)) {
      cb(new Error('Invalid field name. Only "productImages" is allowed'), false);
    } else if (file.size > maxFileSize) {
      cb(new Error('Image file size exceeds 2MB limit'), false);
    } else if (!allowedFileTypes.includes(file.mimetype)) {
      cb(new Error('Only JPEG and PNG images are allowed'), false);
    } else {
      cb(null, true); // Accept the file
    }
  },
  filename: function (req, file, cb) {
    // console.log(req.files.length)
    // Inside this we handling the Case when More than 5 images are there than we are not adding and showing error
    if (!file) {
        console.log('No file provided');
          // No file provided, proceed without an image name
          cb(null, '');
    }
    else if(req.body.imagesLength > 5){
      cb(null, '');
    } 
    else {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
      cb(null, filename || '');  // Ensure a valid string is always passed to cb
    }
  },
  
});

// Multer configuration for handling file uploads
const upload = multer({ storage: storage });

// Export the Multer middleware configured to handle an array of 'productImages' with a limit of 5 files

const uploadMiddleware = upload.array('productImages', 5);

// Add default error handling directly in the middleware
const handleUploadErrors = (req, res, next) => {

  // console.log
  uploadMiddleware(req, res, (err) => {
    // console.log(req.files.length);
    if (err) {
      if (err.message === 'Maximum 5 images can be uploaded') {
        res.status(400).json({ Status: false, msg:'Maximum 5 images can be uploaded'+ err.message });
      } else {
        // Handle other errors differently, e.g., log them for debugging
        console.error('Upload error:', err);
        res.status(400).json({ Status: false, msg:'Maximum 5 images can be uploaded or Unexpected field ='+ err.message });
      }
    } else {
      next();
    }
  });
};

module.exports = handleUploadErrors;