const { combineDateTime } = require("../../common/dateFormat");
const executeQuery = require("../../db/connection");
const Feature = require("./feature");
const ProductImage = require("./image");
const Slot = require("./slot");
const moment = require("moment");

// This is the Model for the productMaster Table .
class Product {
  constructor(
    productName,
    productDescription,
    advanceBookingDuration,
    active_fromDate,
    active_toDate,
    productCapacity
  ) {
    this.productName = productName;
    this.productDescription = productDescription;
    this.advanceBookingDuration = advanceBookingDuration;
    this.active_fromDate = active_fromDate;
    this.active_toDate = active_toDate;
    this.productCapacity = productCapacity;
  }

  // Function to Save the product into the productMaster table.
  async saveProduct() {
    try {
      // SQL query to insert a new product into the database
      const insertQuery = `
        INSERT INTO productmaster (
          productName,
          productDescription,
          advanceBookingDuration,
          active_fromDate,
          active_toDate,
          productCapacity,
          isActive
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      // Array of values to be inserted into the query
      const values = [
        this.productName,
        this.productDescription,
        this.advanceBookingDuration,
        this.active_fromDate,
        this.active_toDate,
        this.productCapacity,
        1, // isActive set to 1 by default
      ];

      // Execute the query and await the result
      const result = await executeQuery(insertQuery, values);

      // Check if the product was successfully inserted
      if (result.affectedRows === 1) {
        console.log("Product inserted successfully!");
        return result.insertId; // Return the ID of the newly inserted product
      } else {
        // If insertion fails, throw an error
        throw new Error("Failed to insert product.");
      }
    } catch (error) {
      // Handle any errors that occur during the insertion process
      console.error("Error in inserting product:", error.message);
      throw error; // Throw the error to propagate it up the call stack
    }
  }
  // Find Product By id
  static async findProductById(productId) {
    try {
      // SQL query to fetch a product by its ID
      const selectQuery = `
      SELECT 
        productId,
        productName,
        productDescription,
        advanceBookingDuration,
        active_fromDate,
        active_toDate,
        productCapacity,
        isActive
      FROM productmaster 
      WHERE productId = ?
      `;

      // Execute the query and await the result
      const result = await executeQuery(selectQuery, [productId]);

      // Check if a product was found
      if (result.length > 0) {
        // Return the first product found
        return result[0];
      } else {
        // If product not found, return null
        return null;
      }
    } catch (error) {
      // Handle any errors that occur during the query execution
      console.error("Error finding product by ID:", error.message);
      throw error; // Throw the error to propagate it up the call stack
    }
  }

  // Function to Linking the featureData with the Product class
  static async linkProductWithFeatures(productId, featureData) {
    try {
      const featureIds = [];

      // Loop through featureData and create Feature instances
      for (const featureInfo of featureData) {
        const { name, description } = featureInfo;
        // Creating a new instance of the Feature class using the provided data
        const feature = new Feature(name, description);

        try {
          // Add the feature to the database and get its ID
          const featureId = await feature.addFeature();
          featureIds.push(featureId);
        } catch (error) {
          // If there's an error during feature creation, throw immediately
          throw new Error(
            `Error adding feature "${feature.featureName}": ${error.message}`
          );
        }
      }

      // Create an array of promises for the relation queries
      const relationPromises = featureIds.map((featureId) => {
        const relationQuery = `INSERT INTO productfeature_relation (productId, featureId) VALUES (?, ?)`;
        const relationValues = [productId, featureId];
        return executeQuery(relationQuery, relationValues);
      });

      // Use Promise.all to wait for all promises to resolve
      await Promise.all(relationPromises);
      return true;
    } catch (error) {
      // Handle any errors that occur during the process
      // if error in adding feature than it is directly thrown from here
      // otherwise error will be Inlinking product with features
      if (error.message.includes("Error adding feature")) {
        throw error;
      }
      console.error("Error linking product with features:", error);
      throw new Error(
        `Error In linking product with features: ${error.message}`
      );
    }
  }

  // Function to Linking the ImagePaths With Product ID;
  async linkProductWithImages(productId, imagePaths) {
    try {
      // Create an array to store imageIds
      const imageIds = [];

      // Loop through imagePaths and link each image with the product
      for (const imagePath of imagePaths) {
        try {
          // Add the image to the productimage table and get its ID
          const productImage = new ProductImage(imagePath.filename);
          const imageId = await productImage.addProductImage();
          //store the Image into  our global variable so we can use it later
          imageIds.push(imageId);
        } catch (error) {
          // If there's an error during image creation, throw immediately
          throw new Error(
            `Error adding image "${imagePath}": ${error.message}`
          );
        }
      }

      // Create an array of promises for the relation queries
      const linkPromises = imageIds.map((imageId) => {
        const linkQuery = `INSERT INTO productImage_relation (productId, imageId) VALUES (?, ?)`;
        const linkValues = [productId, imageId];
        return executeQuery(linkQuery, linkValues);
      });

      // Use Promise.all to wait for all promises to resolve
      await Promise.all(linkPromises);

      return true; // Successfully linked images with the product
    } catch (error) {
      // Handle any errors that occur during the process
      // if error in adding image than it is directly thrown from here

      if (error.message.includes("Error adding image")) {
        throw error;
      }
      // otherwise error will be In linking product with images
      console.error("Error linking product with images:", error);
      throw new Error(`Error In linking product with images: ${error.message}`);
    }
  }

  // Function To add Intial slots into slot master for advance booking duration
  /* 
    Explanation of bookingCategory = slot:
    1.In this type system we have the slotData of single Day.
    2. In side the slotData it contain info about slot's  start time , end time ,price and capacity like:
      [{fromTime:"09:30 AM",toTime:"12:30 PM",capacity:4,price:100},{...}]
    3.Basically slotData is in string form beacause we are using form-data for req(due to image upload) 
        so we can't send it as json object directly. SO we use parsedSlotData.
    4. We are creating a new Slots for every Single Day in Active From Date to till active_from date + Advance book Duration.
    5.Inside Every Slots fromTime and toTime we are adding current Date into it using combineDateTime function. 
    6.after succesfully inserted into  DB then only we will move to next slot and stores slotId into slotIds array
    7. after all slots added for advance booking duration days we link productId with slotId.
*/
  /*
  Explanation of bookingCategory = dayWise:

    1. The system processes slot data for dayWise booking, where the slotData contains information for a single day.
    2. Unlike the "slot" category, the slotData for dayWise is an array with only one element, as it represents details for a single day.
    3. The single day slotData includes information about the start time, end time, capacity, and price, similar to the "slot" category.
    4. The slotData is parsed into a JSON format using `parsedSlotData`.
    5. A single day slot is created for the current date using the information from the parsedSlotData.
    6. The fromTime acts as the check-in time, and the toTime represents the next day's time. The combineDateTime function is used to add the next day's date to the toTime.
    7. The system then creates a new instance of the Slot class using the provided data, including the check-in and check-out times, capacity, price, and a status of slotActive.
    8. The slot is added to the database, and the slotId is stored in the slotIds array.
    9. This process is repeated for each day in the date range specified by active_fromDate to active_toDate.
    10. After all slots are added, the system links the productId with each slotId.

*/
  async addInitialSlots(
    productId,
    active_fromDate,
    active_toDate,
    advanceBookingDuration,
    slotData,
    bookingCategory
  ) {
    try {
      // Create an array to store slotIds
      const slotIds = [];

      // Parse slotData into JSON format
      const parsedSlotData = JSON.parse(slotData);

      const currentDate = moment(active_fromDate);
      const toDate = moment(active_fromDate).add(
        advanceBookingDuration,
        "days"
      );
      // Iterate over the date range and create slots for each day according to bookingCategory
      while (
        currentDate.isSameOrBefore(toDate, "day") &&
        currentDate.isSameOrBefore(active_toDate, "day")
      ) {
        // Check the booking category
        // 1st Type Booking Category = "slot";
        if (bookingCategory === "slot") {
          //Adding Slots for slot booking Category
          // Create slots for the current date using iterate through parsedSlotData
          // Here We adding Slots For Each Day of Active From Date to  Advance Duration Days
          for (const slotInfo of parsedSlotData) {
            const { fromTime, toTime, capacity, price } = slotInfo;
            const slotActive = 1; // By default  set status as Active

            // Create a new instance of the Slot class using the provided data
            //Inside combineDateTime We add the date into slottime and combine them
            const slot = new Slot(
              currentDate.format("YYYY-MM-DD"),
              combineDateTime(currentDate, fromTime),
              combineDateTime(currentDate, toTime),
              capacity,
              price,
              slotActive
            );

            try {
              // Add the slot to the database and get its ID
              const slotId = await slot.addSlot();
              slotIds.push(slotId);
            } catch (error) {
              // If there's an error during slot creation, throw immediately
              throw new Error(`Error adding slot: ${error.message}`);
            }
          }
        } else if (bookingCategory === "dayWise") {
          //2nd Type of Booking Category = dayWise

          //Create Single Day Slot for day wise Booking Category
          const { fromTime, toTime, capacity, price } = parsedSlotData[0];
          const slotActive = 1;
          // In This fromTime acts as CheckIn time and
          // Where to Time is next day's time so we are adding next date into this
          const checkInTime = combineDateTime(currentDate, fromTime);
          const nextDayDate = moment(currentDate).add(1, "day");
          const checkOutTime = combineDateTime(nextDayDate, toTime);
          const singleDaySlot = new Slot(
            currentDate.format("YYYY-MM-DD"),
            checkInTime,
            checkOutTime,
            capacity,
            price,
            slotActive
          );
          try {
            // Add the slot to the database and get its ID
            const slotId = await singleDaySlot.addSlot();
            slotIds.push(slotId);
          } catch (error) {
            // If there's an error during slot creation, throw immediately
            throw new Error(`Error adding slot: ${error.message}`);
          }
        }

        // Move to the next day
        currentDate.add(1, "day");
      }
      if (slotIds.length == 0) {
        throw new Error(
          `Error in adding slot Invalid slotData or Empty slotData`
        );
      }
      // Create an array of promises for the relation queries
      const linkPromises = slotIds.map((slotId) => {
        const linkQuery = `INSERT INTO slotproduct_relation (productId, slotId) VALUES (?, ?)`;
        const linkValues = [productId, slotId];
        return executeQuery(linkQuery, linkValues);
      });

      // Use Promise.all to wait for all promises to resolve
      await Promise.all(linkPromises);

      return true; // Successfully linked slots with the product
    } catch (error) {
      // Handle any errors that occur during the process
      // if error in adding slot than it is directly thrown from here
      if (error.message.includes("Error in adding slot")) {
        throw error;
      }
      // otherwise error will be In linking product with slots
      console.error("Error linking product with slots:", error);
      throw new Error(`Error In linking product with slots: ${error.message}`);
    }
  }
}
module.exports = Product;
