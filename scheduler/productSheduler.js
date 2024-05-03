const cron = require('node-cron');
const Product = require('../models/product_model/product'); 
const moment = require('moment');
let schedulerTasks = {}; // Store scheduler tasks by product ID

// Function to stop a scheduler task by product ID
function stopScheduler(productId) {
    if (schedulerTasks[productId]) {
      schedulerTasks[productId].stop();
      delete schedulerTasks[productId];
      console.log(`Scheduler stopped for product with ID ${productId}.`);
    } else {
      console.error(`Scheduler not found for product with ID ${productId}.`);
    }
  }
  

// Function to schedule product deactivation based on active to date
// We are deactivating the product at night of the active to date keeping 5 minite buffer if lot of product is there than may take some time to deactivate.
// Need to set time as 00 55 date month *
function scheduleProductDeactivation(productId, activeToDate) {
const activeToDateMoment = moment(activeToDate, 'YYYY-MM-DD');
  const dayOfMonth = activeToDateMoment.date();
  const month = activeToDateMoment.month() + 1; // Months in Moment.js are zero-based
  // Below is the cron expression for deactivating the product at 11:59 pm on the active to date
  schedulerTasks[productId] = cron.schedule(`25 35 15 ${dayOfMonth} ${month} *`, async () => {
    try {
      
        // Deactivate the product
        await Product.updateProductStatusById(productId,0);
        console.log(`Product with ID ${productId} deactivated.`);
        // Stop the scheduler after deactivation
        stopScheduler(productId);
      
    } catch (error) {
      console.error('Error in product deactivation scheduler:', error);
    }
  });
}

// Example of updating active to date for a product
async function updateActiveToDate(productId, newActiveToDate) {
  try {
    // Stop the previous scheduler (if exists)
    stopScheduler(productId);
    console.log("All is Well");
    
    // Update the active to date in the database
    // await Product.updateActiveToDate(productId, newActiveToDate);

    // Reinitialize the scheduler with the new active to date
    scheduleProductDeactivation(productId, newActiveToDate);
  } catch (error) {
    console.error('Error updating active to date:', error);
  }
}
module.exports = { stopScheduler,scheduleProductDeactivation,updateActiveToDate };
