// Import necessary modules and models
const cron = require('node-cron'); // For scheduling tasks
const moment = require('moment'); // For date and time handling
const Product = require('../models/product_model/product'); 
const { getSelectedCategory } = require('../common/common');
const { slotMasterTable } = require('../db/tables');
const Slot = require('../models/product_model/slot');

// Define the scheduler function
// In this there can be one catch here that currently we are addding the slots for the inactive product also beacause when admin active product again than we need not to worry about the slots
async function scheduleSlotAddition() {
  // Define the cron schedule to run daily a few minutes After 12 PM
  //=> minute hour day month dayOfWeek
  cron.schedule('50 11 * * *', async () => {
    try {
      console.log('Starting slot addition scheduler...');

      // Get the current date and time
      const currentDate = moment().format('YYYY-MM-DD');
      const result= await getSelectedCategory();
        console.log(result.bookingCategoryId);
      const bookingCategoryId = result.bookingCategoryId;
      if(!bookingCategoryId) {
        console.log('No booking category found.');
        return;
      }
    
      // This Part's logic can be alter.
      // Currently fetching all product and then checking the active from date and active to date and then add the slots
      // If product is deactive than also it's slot is adding for future reference.
      
      const products = await Product.getAllProducts();

      // Iterate through each product and add slots if necessary
      for (const product of products) {
        const { productId, active_fromDate, active_toDate,advanceBookingDuration,slotData } = product;

        // Calculate the active to date based on current date + advance booking duration
        const slotDate = moment(currentDate)
          .add(advanceBookingDuration-1, 'days')
          .format('YYYY-MM-DD');
          // Below is for handling case where activefrom date is lately started so the during intiallization the slots are added default so we need not to add slot beetween active from date + adavnce booking duration (beacause i)
          const intialSlotAddedDate = moment(active_fromDate)
          .add(advanceBookingDuration-1, 'days')
          .format('YYYY-MM-DD');
        
        
        // Add slots for the current day if within the active date range
        console.log( moment(active_fromDate).format('YYYY-MM-DD'));
        console.log(moment(active_toDate).format('YYYY-MM-DD'));
        console.log(intialSlotAddedDate);
        console.log(slotDate)
        
        if (slotDate >= moment(active_fromDate).format('YYYY-MM-DD') && slotDate <= moment(active_toDate).format('YYYY-MM-DD') && intialSlotAddedDate<slotDate) {
           console.log(slotDate,productId, moment(active_toDate));
           if(slotData==null) console.error(`No slotData Found for the ${productId}`);
           else await Product.addSingleDateSlotByProductId(slotDate,bookingCategoryId,slotData,productId);
        }
      }
      // Calculate the date for the previous day
      const previousDay = moment().subtract(1, 'day').format('YYYY-MM-DD');
      console.log(previousDay);

      // Delete slots for the previous day
      const deletedSlotResult = await Slot.deleteSlotByDate(previousDay);
      // console.log(products)
      console.log(deletedSlotResult)
      console.log('Slot addition scheduler completed.');
    } catch (error) {
        
      console.error('Error in slot addition scheduler:', error);
    }
  });
}

// Export the scheduler function to be used elsewhere
module.exports = { scheduleSlotAddition };
