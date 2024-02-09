const moment = require('moment');

// Function to validate product details
const productDetailsValidation = (productName, productDescription, advanceBookingDuration, active_fromDate, active_toDate, productCapacity, featureData, slotData, bookingCategoryId) => {
    if (!productName || !productDescription || !advanceBookingDuration || !active_fromDate || !active_toDate || !productCapacity || !featureData || !slotData || !bookingCategoryId) {
        return { isValid: false, message: 'Invalid data. Please provide all required fields.' };
    }
    if (productName.length > 100) {
        return { isValid: false, message: 'The name of the product should not exceed 100 characters.' };
    }

    // Validate date format (YYYY-MM-DD)
    if (!moment(active_fromDate, 'YYYY-MM-DD', true).isValid() || !moment(active_toDate, 'YYYY-MM-DD', true).isValid()) {
        return { isValid: false, message: 'Invalid date format. Please use YYYY-MM-DD or enter a valid date.' };
    }

    // Convert date strings to moment objects for comparison
    const fromDate = moment(active_fromDate);
    const toDate = moment(active_toDate);

    // Validate that toDate is greater than or equal to fromDate
    if (!toDate.isSameOrAfter(fromDate)) {
        return { isValid: false, message: 'active_toDate must be greater than or equal to active_fromDate.' };
    }

    // Validate fromDate is greater than or equal to the current date
    const currentDate = moment().startOf('day');
    if (!fromDate.isSameOrAfter(currentDate)) {
        return { isValid: false, message: 'active_fromDate must be greater than or equal to the current date.' };
    }

    return { isValid: true };
};

// Function to validate slot data
const slotValidation = (slotData, bookingCategoryId) => {
    // const parsedSlotData = JSON.parse(slotData);
    for (const slot of slotData) {
        if (!slot.fromTime || !slot.toTime || !slot.capacity || !slot.price) {
            return { isValid: false, message: 'Invalid slotData. Missing required fields.' };
        }
        const fromTime = moment(slot.fromTime, 'HH:mm', true);
        const toTime = moment(slot.toTime, 'HH:mm', true);
        if (!fromTime.isValid() || !toTime.isValid()) {
            return { isValid: false, message: 'Invalid time format. Please use HH:mm.' };
        }
        if (bookingCategoryId == 1 && fromTime >= toTime) {
            return { isValid: false, message: 'Invalid slotData. fromTime must be before toTime.' };
        }
        if (bookingCategoryId == 2 && toTime > fromTime) {
            return { isValid: false, message: 'Invalid slotData. checkOut Time must be before or same as checkInTime.' };
        }
    }
    return { isValid: true };
};

// Function to validate feature data
const featureValidation = (featureData) => {
    // const parsedFeatureData = JSON.parse(featureData);
    if (!Array.isArray(featureData)) {
        return { isValid: false, message: 'Invalid featureData. It should be an array.' };
    }
    for (const featureInfo of featureData) {
        if (!featureInfo.name || !featureInfo.description) {
            return { isValid: false, message: 'Invalid featureData. Missing required fields.' };
        }
        if (featureInfo.name.length > 45) {
            return { isValid: false, message: "Invalid featureData: featureName can't exceed 45 characters." };
        }
    }
    return { isValid: true };
};

module.exports = { productDetailsValidation, slotValidation, featureValidation };
