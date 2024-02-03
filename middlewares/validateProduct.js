const { isValidSqlDateFormat } = require("../common/dateFormat");

// This middleware is for validating the product data before it gets saved to the database.
const validateProduct = (req, res, next) => {
  const {
      productName,
      productDescription,
      advanceBookingDuration,
      active_fromDate,
      active_toDate,
      productCapacity,
      featureData,
      imagesLength
  } = req.body;

  // Check if all required fields are present
//   console.log(req)
  if (!productName || !productDescription || !advanceBookingDuration || !active_fromDate || !active_toDate || !productCapacity || !featureData) {
      return res.status(400).json({ Status: false, msg: 'Invalid data. Please provide all required fields.' });
  }

  // Validate date format (YYYY-MM-DD)
  if (!isValidSqlDateFormat(active_fromDate) || !isValidSqlDateFormat(active_toDate)) {
      return res.status(400).json({ Status: false, msg: 'Invalid date format. Please use YYYY-MM-DD. or enter Valid Date' });
  }

  // Convert date strings to Date objects for further comparison
  const fromDate = new Date(active_fromDate);
  const toDate = new Date(active_toDate);

  // Validate that toDate is greater than fromDate
  if (fromDate > toDate) {
      return res.status(400).json({ Status: false, msg: 'active_toDate must be greater than or equal to active_fromDate.' });
  }

  // Validate fromDate is greater than or equal to the current date for first Time adding product
  const currentDate = new Date();
  var currentDateWithoutTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  // console.log(currentDateWithoutTime);
  if (fromDate < currentDateWithoutTime) {
      return res.status(400).json({ Status: false, msg: 'active_fromDate must be greater than or equal to the current date.' });
  }
/* 
  // Validation for the maximum 7 images can be uploaded
 
  if(imagesLength>7){
    return res.status(400).json({ Status: false, msg: 'Maximum 7 product images can be uploaded' }); 
  } */

  console.log("Product Successfully verified");

  // If validation passes, call next to proceed to the next middleware or route handler
  next();
};

// Export the middleware for use in other files
module.exports = validateProduct;

  