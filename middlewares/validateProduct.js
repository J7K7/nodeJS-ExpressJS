const { parse } = require("express-form-data");
const { isValidSqlDateFormat } = require("../common/dateFormat");
const moment = require('moment');
// This middleware is for validating the product data before it gets saved to the database.
const validateProduct = (req, res, next) => {
  var {
      productName,
      productDescription,
      advanceBookingDuration,
      active_fromDate,
      active_toDate,
      productCapacity,
      featureData,
      slotData,
      bookingCategoryId
  } = req.body;

  // Check if all required fields are present
//   console.log(req)
  if (!productName || !productDescription || !advanceBookingDuration || !active_fromDate || !active_toDate || !productCapacity || !featureData || !slotData || !bookingCategoryId) {
      return res.status(400).json({ Status: false, msg: 'Invalid data. Please provide all required fields.' });
  }
  if(productName.length>100){
    return res.status(400).json({Status:false,msg: "The name of the product should not exceed 100 characters."});
  }

// Validation For the Active From Date and to date 

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
  //FeatureData validation 
  featureData=JSON.parse(featureData);
  if (!Array.isArray(featureData)) {
    return res.status(400).json({ Status: false, msg: 'Invalid featureData. It should be an array.' });
  }
  for (const featureInfo of featureData) {
    if (!featureInfo.name || !featureInfo.description) {
        return res.status(400).json({ Status: false, msg: 'Invalid featureData. Missing required fields.' });
    }
    if(featureInfo.name.length>45){
      return res.status(400).json({Status:false ,msg:"Invalid featureData: featureName can't exceed 45 characters"});
    }
  }


  //Validation for the slotData array.
  const parsedSlotData = JSON.parse(slotData);
  if (!Array.isArray(parsedSlotData)) {
    return res.status(400).json({ Status: false, msg: 'Invalid slotData. It should be an array.' });
  }
  if(bookingCategoryId=='dayWise' && parsedSlotData.length>1){
        return res.status(400).json({ Status: false, msg: 'Invalid slotData. In DayWise Booking Category per Day contain only one slot' });
  }
  for (const slot of parsedSlotData) {
    if (!slot.slotFromDateTime || !slot.slotToDateTime || !slot.slotOriginalCapacity || !slot.slotPrice) {
        return res.status(400).json({ Status: false, msg: 'Invalid slotData. Missing required fields.' });
    }
    let fromTime = moment(slot.slotFromDateTime,'HH:mm');
    let toTime = moment(slot.slotToDateTime,'HH:mm')
    fromTime=fromTime.format('HH:mm');
    toTime=toTime.format('HH:mm');
    if (bookingCategoryId==='slot' && fromTime>=toTime) {
        return res.status(400).json({ Status: false, msg: 'Invalid slotData. fromTime must be before toTime.' });
    }
    if(bookingCategoryId==='dayWise' &&   toTime>fromTime){
      console.log(fromTime,toTime)
      return res.status(400).json({ Status: false, msg: 'Invalid slotData. checkOut Time must be before or same as checkInTime.' });
    }
  }


  console.log("Product Successfully verified");

  // If validation passes, call next to proceed to the next middleware or route handler
  next();
};

// Export the middleware for use in other files
module.exports = validateProduct;

  