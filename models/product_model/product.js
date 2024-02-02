const executeQuery = require("../../db/connection");
const Feature = require("./feature");
const ProductImage = require("./image");

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
  // Function to Linking the featureData with the Product class
  async linkProductWithFeatures(productId, featureData) {
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
      return true
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
          const  imageId = await productImage.addProductImage();
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
      throw new Error(
        `Error In linking product with images: ${error.message}`
      );
    }
  }
  
}
module.exports = Product;
