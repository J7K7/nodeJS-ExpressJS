const multer = require("multer");
const path = require("path");
const fs = require("fs");
//accesing environment variables
const maxImageSize = process.env.MAX_PRODUCT_IMAGE_SIZE_MB;
const maxImageSizeBytes = parseInt(maxImageSize) * 1024 * 1024; // bytes

const maxImagesPerProduct = process.env.MAX_IMAGES_PER_PRODUCT;
const maxImagesPerProductNumber = parseInt(maxImagesPerProduct);
// console.log(maxImagesPerProductNumber);
// console.log(maxImageSizeBytes);

// Multer configuration for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // console.log(req.body.imagesLength )
    const uploadPath = path.join(__dirname, "../public/images", "product");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // console.log(req.files.length)
    // console.log(req.files)
    
    if (!file) {
      console.log("No file provided");
      // No file provided, proceed without an image name
      cb(null, "");
    }  else {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const filename =
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname);
      cb(null, filename || ""); // Ensure a valid string is always passed to cb
    }
  },
});

// Multer configuration for handling file uploads
const upload = multer({
  storage: storage,
  limits: { fileSize:maxImageSizeBytes}, // Max file size in bytes here, (10 MB)
  fileFilter: (req, file, cb) => {
    // This will check the mimetype of the uploaded file against our list of allowed types and return an error

    console.log("filefilter");
    const expectedFieldNames = ["productImages"];
    const allowedFileTypes = ["image/jpeg", "image/png", "image/jpg"];
    // console.log(file);
    if (!expectedFieldNames.includes(file.fieldname)) {
      cb(
        new Error('Invalid field name. Only "productImages" is allowed'),
        false
      );
    }  
    else if (!allowedFileTypes.includes(file.mimetype)) {
      cb(new Error("Only JPEG and PNG and jpg images are allowed"), false);
    } else {
      cb(null, true); // Accept the file
    }
  },
});

// Export the Multer middleware configured to handle an array of 'productImages' with a limit of 5 files

const uploadMiddleware = upload.array("productImages", maxImagesPerProductNumber);

// Add default error handling directly in the middleware
const handleUploadErrors = (req, res, next) => {
  // console.log
  uploadMiddleware(req, res, (err) => {
    
    if (err) {
      // if error is from Multer itself e.g. too large file etc.
      // than remove all files data from req so it can not be added into database
      const files=[];
      req.files=files;
      /*   req.files.forEach((file) => {
        fs.unlinkSync(file.path);
      }); */

      console.log(req.files);
      if (err.message.includes('Unexpected field')) {
        return res.status(400).json({ Status: false, msg: "Maximum " + maxImagesPerProductNumber+ " images can be uploaded  " +  err.message });
      }
      else
     { return res.status(400).json({
        Status: false,
        msg:
          "Image Upload Error : " +
          err.message,
      });}
    } else {
      next();
    }
  });
};

module.exports = handleUploadErrors;
