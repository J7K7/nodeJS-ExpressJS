const moment = require("moment");
const ProductCategory = require('../models/product_model/category')

// Function to validate product details
const productDetailsValidation = async (
  productCategoryId,
  productName,
  productDescription,
  advanceBookingDuration,
  active_fromDate,
  active_toDate,
  productCapacity,
  featureData,
  slotData,
  bookingCategoryId
) => {
  if (!productCategoryId) {
    return { isValid: false, message: "Select category for this product." };
  }

  // Check if the provided categoryId exists in the database
  const category = await ProductCategory.findCategoryById(productCategoryId);

  if (category == null) {
    return { isValid: false, message: "Category not found." };
  }

  if (
    !productName ||
    !productDescription ||
    !advanceBookingDuration ||
    !active_fromDate ||
    !active_toDate ||
    !productCapacity ||
    !featureData ||
    !slotData ||
    !bookingCategoryId
  ) {
    return {
      isValid: false,
      message: "Invalid data. Please provide all required fields.",
    };
  }
  if (productName.length > 100) {
    return {
      isValid: false,
      message: "The name of the product should not exceed 100 characters.",
    };
  }
  if (productCapacity <= 0) {
    return { isValid: false, message: "productCapacity Can not be zero" };
  }
  if (advanceBookingDuration <= 0) {
    return {
      isValid: false,
      message: "advance BookingDuration Can not be zero",
    };
  }
  if (advanceBookingDuration > 365 ) {
    return {
      isValid: false,
      message:"advanceBookingDuration can Have maximum value 1 year(365 Days)",
    };
    
  }

  // Validate date format (YYYY-MM-DD)
  if (
    !moment(active_fromDate, "YYYY-MM-DD", true).isValid() ||
    !moment(active_toDate, "YYYY-MM-DD", true).isValid()
  ) {
    return {
      isValid: false,
      message:
        "Invalid date format. Please use YYYY-MM-DD or enter a valid date.",
    };
  }

  // Convert date strings to moment objects for comparison
  const fromDate = moment(active_fromDate);
  const toDate = moment(active_toDate);

  // Validate that toDate is greater than or equal to fromDate
  if (!toDate.isSameOrAfter(fromDate)) {
    return {
      isValid: false,
      message:
        "active_toDate must be greater than or equal to active_fromDate.",
    };
  }

  // Validate fromDate is greater than or equal to the current date
  const currentDate = moment().startOf("day");
  if (!fromDate.isSameOrAfter(currentDate)) {
    return {
      isValid: false,
      message:
        "active_fromDate must be greater than or equal to the current date.",
    };
  }

  // Validate the bookingCategory
  if (!(bookingCategoryId == 1 || bookingCategoryId == 2)) {
    return {
      isValid: false,
      message:
        "Booking Category Id has two option only either 1(slot) or Either 2(dayWise)",
    };
  }

  return { isValid: true };
};

// Function to validate slot data
const slotValidation = (slotData, bookingCategoryId) => {
  // const parsedSlotData = JSON.parse(slotData);
  for (const slot of slotData) {
    if (!slot.slotFromDateTime || !slot.slotToDateTime || !slot.slotOriginalCapacity || !slot.slotPrice) {
      return {
        isValid: false,
        message: "Invalid slotData. Missing required fields.",
      };
    }
    const fromTime = moment(slot.slotFromDateTime, "HH:mm", true);
    const toTime = moment(slot.slotToDateTime, "HH:mm", true);
    if (!fromTime.isValid() || !toTime.isValid()) {
      return {
        isValid: false,
        message: "Invalid time format. Please use HH:mm.",
      };
    }
    if (bookingCategoryId == 1 && fromTime >= toTime) {
      return {
        isValid: false,
        message: "Invalid slotData. fromTime must be before toTime.",
      };
    }
    if (bookingCategoryId == 2 && toTime > fromTime) {
      return {
        isValid: false,
        message:
          "Invalid slotData. checkOut Time must be before or same as checkInTime.",
      };
    }
  }
  // If none of the above conditions are met, return an object indicating that the slotData is valid
  return { isValid: true };
};

// Function to validate feature data
const featureValidation = (featureData) => {
  // const parsedFeatureData = JSON.parse(featureData);
  if (!Array.isArray(featureData)) {
    return {
      isValid: false,
      message: "Invalid featureData. It should be an array.",
    };
  }
  for (const featureInfo of featureData) {
    if (!featureInfo.name || !featureInfo.description) {
      return {
        isValid: false,
        message: "Invalid featureData. Missing required fields.",
      };
    }
    if (featureInfo.name.length > 45) {
      return {
        isValid: false,
        message: "Invalid featureData: featureName can't exceed 45 characters.",
      };
    }
  }
  return { isValid: true };
};

module.exports = {
  productDetailsValidation,
  slotValidation,
  featureValidation,
};
