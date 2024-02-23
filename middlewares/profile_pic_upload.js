const multer = require("multer");
const path = require("path");

// Configuring multer's disk storage settings.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Setting the destination path for the uploaded files.
    cb(null, "public/images/user"); //path to save the files in server
  },
  filename: (req, file, cb) => {
    if (!file) {
      console.log("No file provided");
      // No file provided, proceed without an image name
      cb(null, "");
    } else {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const fileName = file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
      cb(
        null,
        fileName
      );
    }
  },
});

// Configuring multer settings with the storage setting, file filter, and size limit.
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, callback) {
    //if there is no file present in  request then simply procedd  with the next middleware
    if (!file) return callback();

    const expectedFieldNames = ["profileImage"];
    const  imageMimesTypes = ['image/jpeg','image/jpg','image/png'];  // Array of allowed extention  types


    // Check if the received field name is expected
    if (!expectedFieldNames.includes(file.fieldname)) {
        const err = new Error("Unexpected field");
      return callback(err); // Reject the file with an error
    } else if(!imageMimesTypes.includes(file.mimetype)) {
      const err = new Error("Invalid Image Type");
      return callback(err);
    }

    callback(null, true); // Accept the file
  },
  limits:  { fileSize: 2*1024*1024 }, // Max limit is set to  2MB
});

// Creating a middleware function for handling uploading a single file.
const uploadMiddleware=upload.single('profileImage');

// Creating an error handling middleware function for uploadMiddleware.
const handleUploadError = (req, res, next) => {
    uploadMiddleware (req,res,(err) => {
        if(err){
            console.log(err)
            return  res.status(422).send({msg: err.message, Status: false})
        }
        else{
            next();
        }
    })
}

module.exports = handleUploadError;
