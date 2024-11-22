const { combineDateTime } = require("../../common/dateFormat");
const { executeQuery } = require("../../db/connection");
const { slotMasterTable, productCategory } = require("../../db/tables");
const Feature = require("./feature");
const ProductImage = require("./image");
const Slot = require("./slot");
const moment = require("moment");
const { generalProductDetailsQuery } = require("../../common/common");

// This is the Model for the productMaster Table .
//In this view can be cretaed for product details keep it for future.

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
    this.slotData = slotData;
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
  static async getAllProductDetailsWithImagesAndFeatures(productCategoryId = null) {
    try {
      // SQL query to fetch all product details with images and features
      var query = generalProductDetailsQuery() + `LEFT JOIN productcategory_product_relation AS pcr ON pm.productId = pcr.productId
      WHERE pm.isDeleted = 0 AND pm.isActive = 1
      AND (pcr.productCategoryId = ? OR ? IS NULL)`;
      // query += `pm.isDeleted=0 `;
      // console.log(query);
      // Execute the query
      const result = await executeQuery(query, [productCategoryId, productCategoryId]);

      // Return the result rows
      return result;
    } catch (error) {
      throw new Error(`Error fetching all product details: ${error.message}`);
    }
  }
  // This Fucntion for fetching not deleted products details only from productMaster like name,id,slotData etc..

  static async getAllProducts() {
    try {
      // SQL query to fetch all not deleted products
      const query = `
          SELECT productId,
          productName,
          productDescription,
          advanceBookingDuration,
          active_fromDate,
          active_toDate,
          productCapacity,
          slotData
          FROM productmaster
          WHERE isDeleted=0
        `;
      // isActive = 1 and 
      // Execute the query and await the result
      const result = await executeQuery(query);

      // Return the result rows
      return result;
    } catch (error) {
      throw new Error(`Error fetching all active products: ${error.message}`);
    }
  }
  // This is the searchProducts By passing query Params It perform the search Operation

  static async searchProducts(query) {
    try {
      var searchQuery = query.q; // Default to empty string if not provided
      const slotDate = query.slotDate;
      const checkInDate = query.checkInDate;
      const checkOutDate = query.checkOutDate;

      // Build the base query
      let sql = `
        SELECT p.productId,
        p.productName,
        p.productDescription,
        p.advanceBookingDuration,
        p.active_fromDate,
        p.active_toDate,
        p.productCapacity,
        i.imageId,
        i.imagePath,
        f.featureId,
        f.featureName,
        f.featureDescription,
        sm.slotId,
        sm.slotPrice
        FROM productmaster as p
        LEFT JOIN
            productImage_relation AS pir ON p.productId = pir.productId
        LEFT JOIN
            productimages AS i ON pir.imageId = i.imageId
        LEFT JOIN
            productfeature_relation AS pfr ON p.productId = pfr.productId
        LEFT JOIN
            product_features AS f ON pfr.featureId = f.featureId
        LEFT JOIN slotproduct_relation spr ON p.productId = spr.productId
        LEFT JOIN slotmaster sm ON spr.slotId = sm.slotId
        WHERE p.isDeleted=0 and p.isActive=1
      `;

      // Add WHERE clauses for search query (if provided) and active slots (if date provided)
      const values = []; // Array to store query parameter values

      if (searchQuery) {
        console.log("search", searchQuery);
        searchQuery = searchQuery.trim();
        sql += ` AND (p.productName LIKE ? OR p.productDescription LIKE ?)`;
        const searchPattern = `%${searchQuery}%`; // Add wildcard '%' around search query
        values.push(searchPattern, searchPattern); // Push parameter values to array
      }

      if (slotDate) {
        sql += `AND sm.slotDate = ? AND sm.slotActive = 1`;
        values.push(slotDate); // Push slotDate parameter value to array
      } else if (checkInDate && checkOutDate) {
        sql += "AND "; // Combine search and date filters with AND

        sql += `
          (SELECT COUNT(*) 
          FROM slotmaster AS sm2
          INNER JOIN slotproduct_relation AS spr2 ON sm2.slotId = spr2.slotId
          WHERE spr2.productId = p.productId
          AND sm2.slotDate >= ?
          AND sm2.slotDate <= ?
          AND sm2.slotActive = 1
          ) = DATEDIFF(?, ?) + 1
        `;
        values.push(checkInDate, checkOutDate, checkOutDate, checkInDate);
      }

      // Execute the query
      // console.log(sql);
      // console.log(values);
      const result = await executeQuery(sql, values); // Pass the SQL query and parameter values to executeQuery
      // Return the result rows
      // console.log(result.length);
      // console.log(result);
      return result;
    } catch (error) {
      console.log(error);
      throw new Error(`Error In Searching product: ${error.message}`);
    }
  }

  //Get Product Details By Id This resturn all type of product deleted and not active etc..
  static async getProductDetailsById(productId) {
    try {
      // Query product details from productmaster table
      const productDetailsQuery =
        generalProductDetailsQuery() +
        `WHERE
          pm.productId = ? 
      `;
      const result = await executeQuery(productDetailsQuery, [productId]);
      // console.log(result,productId)
      if (result.length === 0) {
        throw new Error("No Product Found with this productId");
      }
      return result;
    } catch (error) {
      console.error("Error fetching product details:", error);
      throw error;
    }
  }
  // It return's the top 10 popular products  based on number of bookings made for that products
  // If it is less than the 10 products than add some other products
  static async getPopularProducts() {
    try {
      // Build the base query
      const topProductIdsQuery = `
      SELECT productId
      FROM bookProduct
      GROUP BY productId
      ORDER BY COUNT(bookingId) DESC
      LIMIT 10
  `;
      // In this need to add one more case where we have to show only those products which are currently available in market place means not deleted and active
      //  So keep it for future if needed (there less chances that admin delete it's most selling Product)
      const topProductIdsResult = await executeQuery(topProductIdsQuery);
      const topProductIds = topProductIdsResult.map((row) => row.productId);

      let additionalProductIdsParams = [];

      // If topProductIds has less than 10 elements, add additional IDs
      if (topProductIds.length < 10) {
        // If need to generate random product than add
        // ORDER BY RAND()
        // but it slows down the query execution time so we are not using it here
        const remainingIdsCount = 10 - topProductIds.length;
        var additionalIdsQuery;
        // If topProductIds is not empty, add the topProductIds to the query  
        if (topProductIds.length > 0) {
          additionalIdsQuery = `
              SELECT productId
              FROM productmaster
              WHERE productId NOT IN (${topProductIds.join(",")})
                  AND isActive = 1
                  AND isDeleted = 0
              LIMIT ${remainingIdsCount}
          `;
        } else {
          // If topProductIds is empty, set additionalIdsQuery to an empty string
          additionalIdsQuery = `
              SELECT productId
              FROM productmaster
              WHERE isActive = 1
                  AND isDeleted = 0
              LIMIT ${remainingIdsCount}
          `;
        }
        const additionalIdsResult = await executeQuery(additionalIdsQuery);
        additionalProductIdsParams = additionalIdsResult.map(
          (row) => row.productId
        );
      }

      // Combine topProductIds and additionalProductIdsParams to get a total of 10 IDs
      const finalProductIds = [...topProductIds, ...additionalProductIdsParams];

      // Now use finalProductIds For fething productDetails
      const result = await this.getProductDetailsForIds(finalProductIds);

      // const result = await executeQuery(sql); // Pass the SQL query and parameter values to executeQuery
      // console.log(finalProductIds);
      // console.log(result);
      return result;
    } catch (error) {
      console.log(error);
      throw new Error(`Error In Finding Popular product: ${error.message}`);
    }
  }
  // It return's the top 10 latest products which are added into database.
  // This return active and not deleted products with that particular category
  static async getLatestProducts(productCategoryId = null) {
    try {
      // Build the base query
      let latestProductIdQuery = `
      SELECT pm.productId
      FROM productmaster AS pm
      LEFT JOIN productcategory_product_relation AS pcr ON pm.productId = pcr.productId
      WHERE pm.isDeleted = 0 AND pm.isActive = 1
      AND (pcr.productCategoryId = ? OR ? IS NULL)
      GROUP BY pm.productId
      ORDER BY pm.timestamp DESC
      LIMIT 10`;

      const latestProductIdsResult = await executeQuery(latestProductIdQuery, [productCategoryId, productCategoryId]); // Pass the SQL query and parameter values to executeQuery
      const latestProductIds = latestProductIdsResult.map((row) => row.productId);
      // If No product Found than return the empty array
      if (latestProductIdsResult.length == 0) {
        return [];
      }

      // console.log(latestProductIds);
      const result = await this.getProductDetailsForIds(latestProductIds);

      return result;
    } catch (error) {
      console.log(error);
      throw new Error(`Error In Finding Popular product: ${error.message}`);
    }
  }
  static async getProductDetailsForIds(productIds) {
    try {
      if (!Array.isArray(productIds)) {
        throw new Error("Invalid productIds array.");
      }

      // Construct the IN clause for the SQL query
      const productIdList = productIds.map((id) => `'${id}'`).join(",");

      // Build the product details query with the specified order
      const productDetailsQuery =
        generalProductDetailsQuery() +
        `
        WHERE pm.productId IN (${productIdList})
        ORDER BY FIELD(pm.productId, ${productIdList})
      `;

      const result = await executeQuery(productDetailsQuery, [
        ...productIds,
        ...productIds,
      ]);
      // console.log(result);
      return result;
    } catch (error) {
      console.error("Error Fetching product details:", error);
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
  static async findProductCountByName(productName) {
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
  static async updateProductDetailsByProductId(
    productId,
    productName,
    productDescription,
    active_toDate,
    productCapacity
  ) {
    try {
      const selectQuery = `
          SELECT COUNT(*) AS productCount
          FROM productmaster 
          WHERE productName = ? and productId !=? 
      `;

      // Execute the query and await the result
      const cntResult = await executeQuery(selectQuery, [
        productName,
        productId,
      ]);

      // Extract the product count from the result
      const productCount = cntResult[0].productCount;
      console.log(cntResult);
      if (productCount > 0) {
        throw new Error("This product name already exists");
      }
      let query =
        "update productmaster set productName=?, productDescription=?, active_toDate=?, productCapacity=? where productId = ?";
      let queryparam = [
        productName,
        productDescription,
        active_toDate,
        productCapacity,
        productId,
      ];
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
      if (featureIds.length == 0) {
        throw new Error(`No Feature Is Provided Please Provide atleast one feature`);
      }

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
      console.log(result.length);

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
      [{slotFromTime:"09:30 AM",slotToTime:"12:30 PM",slotCapacity:4,slotPrice:100},{...}]
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
        advanceBookingDuration - 1,
        "days"
      );
      // Iterate over the date range and create slots for each day according to bookingCategory
      while (
        currentDate.isSameOrBefore(toDate, "day") &&
        currentDate.isSameOrBefore(active_toDate, "day")
      ) {
        // Adding slots into the slotmaster table
        const singleDaySlotIds = await Slot.addSingleDateSlot(
          slotData,
          currentDate,
          bookingCategoryId
        );
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
      const linkingResult = await this.linkSlotsWithProduct(productId, slotIds);

      return true; // Successfully linked slots with the product
    } catch (error) {
      // Handle any errors that occur during the process
      throw error;
    }
  }
  /**
* Add slots for a specific date and link them with the specified product ID.
* @param {string} slotDate - The date for which slots are to be added (YYYY-MM-DD format).
* @param {string} bookingCategoryId - The ID of the booking category for the slots.(DayWise(2) or slotwise(1))
* @param {object} slotData - The slot data to be added (assumed to be valid and in the correct format).
* @param {string} productId - The ID of the product to link the slots with (assumed to be valid).
* @returns {boolean} - True if slots were successfully added and linked with the product, false otherwise.
*/
  static async addSingleDateSlotByProductId(slotDate, bookingCategoryId, slotData, productId) {
    try {
      // Create an array to store slotIds
      const slotIds = [];

      // Add slots for the specified date and booking category
      const singleDaySlotIds = await Slot.addSingleDateSlot(slotData, slotDate, bookingCategoryId);
      slotIds.push(...singleDaySlotIds);
      // Check if the slotIds array is empty
      if (slotIds.length === 0) {
        throw new Error(`Error in adding slots: Invalid slotData or Empty slotData`);
      }
      console.log(slotIds);

      // Link the slots with the specified productId
      const linkingResult = await this.linkSlotsWithProduct(productId, slotIds);

      console.log(linkingResult);

      return true; // Successfully linked slots with the product
    } catch (error) {
      // Handle any errors that occur during the process
      throw error;
    }
  }

  static async deleteProductById(productId) {
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
        throw new Error("Product not found");
      }
    } catch (error) {
      // If an error occurs during the database operation, throw an error with details
      throw new Error(`Error deleting product: ${error.message}`);
    }
  }
}
module.exports = Product;
