const { combineDateTime } = require("../../common/dateFormat");
const {executeQuery} = require("../../db/connection");
const { slotMasterTable } = require("../../db/tables");
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
    productCapacity,
    slotData
  ) {
    this.productName = productName;
    this.productDescription = productDescription;
    this.advanceBookingDuration = advanceBookingDuration;
    this.active_fromDate = active_fromDate;
    this.active_toDate = active_toDate;
    this.productCapacity = productCapacity;
    this.slotData=slotData;
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
          slotData,
          isActive
        )
        VALUES (?, ?, ?, ?, ?, ?,?, ?)
      `;

      // Array of values to be inserted into the query
      const values = [
        this.productName,
        this.productDescription,
        this.advanceBookingDuration,
        this.active_fromDate,
        this.active_toDate,
        this.productCapacity,
        this.slotData,
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
  // Get All ProductDetails With Images And Feature not deleted products
  static async getAllProductDetailsWithImagesAndFeatures() {
    try {
        // SQL query to fetch all product details with images and features
        const query = `
        SELECT
        pm.productId,
        pm.productName,
        pm.productDescription,
        pm.advanceBookingDuration,
        pm.active_fromDate,
        pm.active_toDate,
        pm.productCapacity,
        pi.imageId,
        pi.imagePath,
        pf.featureId,
        pf.featureName,
        pf.featureDescription
      FROM
          productmaster AS pm
      LEFT JOIN
          productImage_relation AS pir ON pm.productId = pir.productId
      LEFT JOIN
          productimages AS pi ON pir.imageId = pi.imageId
      LEFT JOIN
          productfeature_relation AS pfr ON pm.productId = pfr.productId
      LEFT JOIN
          product_features AS pf ON pfr.featureId = pf.featureId
      WHERE 
          pm.isDeleted = 0 
        `;

        // Execute the query
        const result = await executeQuery(query);

        // Return the result rows
        return result;
    } catch (error) {
        throw new Error(`Error fetching all product details: ${error.message}`);
    }
}

  //Get Product Details By Id
  static async getProductDetailsById(productId) {
    try {
      // Query product details from productmaster table
      const productDetailsQuery = `
      SELECT
        pm.productId,
        pm.productName,
        pm.productDescription,
        pm.advanceBookingDuration,
        pm.active_fromDate,
        pm.active_toDate,
        pm.productCapacity,
        pi.imageId,
        pi.imagePath,
        pf.featureId,
        pf.featureName,
        pf.featureDescription
      FROM
          productmaster AS pm
      LEFT JOIN
          productImage_relation AS pir ON pm.productId = pir.productId
      LEFT JOIN
          productimages AS pi ON pir.imageId = pi.imageId
      LEFT JOIN
          productfeature_relation AS pfr ON pm.productId = pfr.productId
      LEFT JOIN
          product_features AS pf ON pfr.featureId = pf.featureId
      WHERE
          pm.productId = ?
      `;
      const result= await executeQuery(productDetailsQuery, [productId]);
      if(result.length === 0){
        throw new Error("No Product Found with this productId")
      }
      return result;
    } catch (error) {
      console.error("Error fetching product details:", error);
      throw error;
    }
  }
  // Find Product By id in productMaster
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
        // If product not found
        throw new Error("Product not found");
      }
    } catch (error) {
      // Handle any errors that occur during the query execution
      console.error("Error finding product by ID:", error.message);
      throw error; // Throw the error to propagate it up the call stack
    }
  }
  // check Product existence By productName 
  static async findProductCountByName(productName){
    try {
      // SQL query to count the number of products with the given name
      const selectQuery = `
          SELECT COUNT(*) AS productCount
          FROM productmaster 
          WHERE productName = ?
      `;

      // Execute the query and await the result
      const result = await executeQuery(selectQuery, [productName]);

      // Extract the product count from the result
      const productCount = result[0].productCount;

      // Return the product count
      return productCount;
  } catch (error) {
      // Handle any errors that occur during the query execution
      console.error("Error finding product count by name:", error.message);
      throw error; // Throw the error to propagate it up the call stack
  }
  }
  // Update Product Status like activate , deactivate 
  static async updateProductStatusById(productId, status) {
    try {
      // Construct SQL query to update slot status by ID
      const updateQuery = `
        UPDATE productmaster
        SET isActive = ?
        WHERE productId = ?
      `;

      // Execute the update query to update the slot status
      const result = await executeQuery(updateQuery, [status, productId]);

      // Check if the update was successful
      if (result.affectedRows === 0) {
        throw new Error("Product not found");
      }
      return true;
    } catch (error) {
      // Handle errors
      throw error;
    }
  }
  // Update Product's Info like productName , description;
  // admin can change the activeToDate untill the current Date + adavnceBookingDuration
  static async updateProductDetailsByProductId (productId , productName, productDescription, active_toDate, productCapacity )  {
    try {
      let query = "update productmaster set productName=?, productDescription=?, active_toDate=?, productCapacity=? where productId = ?"
      let queryparam = [ productName, productDescription, active_toDate, productCapacity, productId];
      const result = await executeQuery(query, queryparam);
      if (!result || !result.affectedRows > 0) {
        throw new Error("Updation of Product Information Failed");
      }
      return result; 
    } catch (error) {
      console.log("Error in Updating Product Info :", error);
      throw error;
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
      // This is old 1st Method : Using Promises we do multiple queries.Not good for performance
      /*  // Create an array of promises for the relation queries
      const relationPromises = featureIds.map((featureId) => {
        const relationQuery = `INSERT INTO productfeature_relation (productId, featureId) VALUES (?, ?)`;
        const relationValues = [productId, featureId];
        return executeQuery(relationQuery, relationValues);
      });

      // Use Promise.all to wait for all promises to resolve
      await Promise.all(relationPromises);
      return true; 
      */

      // Create an array of relation values by using flatMap to map each featureId to an array containing both the productId and the featureId.
      // This effectively creates pairs of (productId, featureId) for each featureId.
      const relationValues = featureIds.flatMap((featureId) => [
        productId,
        featureId,
      ]);
      // console.log(relationValues);

      // Generate a SQL query for bulk insertion into the productfeature_relation table.
      // This query uses template literals to dynamically create a VALUES clause with multiple rows, each containing (?, ?) placeholders for insertion.
      // The number of rows is determined by the length of the featureIds array, and Array.fill is used to create an array with that length, each element filled with the string '(?, ?)'.
      // The join(',') method concatenates all these strings with a comma separator to form a single string representing the VALUES clause.
      const bulkInsertQuery = `
        INSERT INTO productfeature_relation (productId, featureId)
        VALUES ${Array(featureIds.length).fill("(?, ?)").join(", ")}
      `;

      // Execute the bulk insert query with the relationValues array, which contains the flattened pairs of (productId, featureId).
      const result = await executeQuery(bulkInsertQuery, relationValues);
      return true; // return as success
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
  static async linkProductWithImages(productId, imagePaths) {
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
      /* Same as Reason as explained in linkfeature.
      // Create an array of promises for the relation queries
      const linkPromises = imageIds.map((imageId) => {
        const linkQuery = `INSERT INTO productImage_relation (productId, imageId) VALUES (?, ?)`;
        const linkValues = [productId, imageId];
        return executeQuery(linkQuery, linkValues);
      });

      // Use Promise.all to wait for all promises to resolve
      await Promise.all(linkPromises);
      */
      // Same explanation as above in  linkFeature function

      // Create an array of link query values by mapping each imageId to an array containing both the productId and the imageId.
      const linkValues = imageIds.flatMap((imageId) => [productId, imageId]);

      // Generate a SQL query for bulk insertion into the productImage_relation table.
      const bulkInsertQuery = `
        INSERT INTO productImage_relation (productId, imageId)
        VALUES ${Array(imageIds.length).fill("(?, ?)").join(", ")}
      `;

      // Execute the bulk insert query with the linkValues array, which contains the flattened pairs of (productId, imageId).
      const result = await executeQuery(bulkInsertQuery, linkValues);

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

  // Function To linking SlotIds with Particular ProductId;
  static async linkSlotsWithProduct(productId, slotIds) {
    try {
        // Create an array of link query values by mapping each slotId to an array containing both the productId and the slotId.
        const linkValues = slotIds.flatMap((slotId) => [productId, slotId]);

        // Generate a SQL query for bulk insertion into the slotproduct_relation table.
        const bulkInsertQuery = `
            INSERT INTO slotproduct_relation (productId, slotId)
            VALUES ${Array(slotIds.length).fill("(?, ?)").join(", ")}
        `;

        // Execute the bulk insert query with the linkValues array, which contains the flattened pairs of (productId, slotId).
        await executeQuery(bulkInsertQuery, linkValues);

        // Return success message or handle further logic if needed
        return "Slots linked with product successfully.";
    } catch (error) {
        // If an error occurs during the linking process, throw an error
        throw new Error(`Error linking slots with product: ${error.message}`);
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
  static async addInitialSlots(
    productId,
    active_fromDate,
    active_toDate,
    advanceBookingDuration,
    slotData,
    bookingCategoryId
  ) {
    try {
      // Create an array to store slotIds
      const slotIds = [];


      const currentDate = moment(active_fromDate);
      // Need to add slots for active_fromDate to active_fromDate+duration-1(beacause we are adding slot for today also)
      // let suppose stating date is 22 and advance booking duration is 5 days than slots will we added for 22+5-1 =26 till 26th date  .(22,23,24,25,26);
      const toDate = moment(active_fromDate).add(
        advanceBookingDuration-1,
        "days"
      );
      // Iterate over the date range and create slots for each day according to bookingCategory
      while (
        currentDate.isSameOrBefore(toDate, "day") &&
        currentDate.isSameOrBefore(active_toDate, "day")
      ) {
        // Adding slots into the slotmaster table 
        const singleDaySlotIds=await Slot.addSingleDateSlot(slotData,currentDate,bookingCategoryId);
        slotIds.push(...singleDaySlotIds);
        // console.log(slotIds)
        // Move to the next day        
        currentDate.add(1, "day");
      }
      if (slotIds.length == 0) {
        throw new Error(
          `Error in adding slot Invalid slotData or Empty slotData`
        );
      }
      const linkingResult=await this.linkSlotsWithProduct(productId,slotIds);

      return true; // Successfully linked slots with the product
    } catch (error) {
      // Handle any errors that occur during the process
      throw error;
    }
  }

  static async deleteProductById(productId){
    try {
      // Construct the SQL query to update the product's isDeleted flag
      const query = `
        UPDATE productmaster
        SET isDeleted = 1
        WHERE productId = ?
      `;

      // Execute the SQL query with the provided product ID
      const result = await executeQuery(query, [productId]);

      // Return the number of rows affected (should be 1 if deletion was successful)
      if (!!result && result.affectedRows > 0) {
        return true;
      } else {
        // If no rows were affected, the product with the provided ID was not found
        throw new Error('Product not found');
      }
    } catch (error) {
      // If an error occurs during the database operation, throw an error with details
      throw new Error(`Error deleting product: ${error.message}`);
    }
  }
}
module.exports = Product;
