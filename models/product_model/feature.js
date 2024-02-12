const executeQuery = require("../../db/connection");

// This is the Model for the productMaster Table .
class Feature {
  constructor(featureName, featureDescription) {
    this.featureName = featureName;
    this.featureDescription = featureDescription;
  }

  // Function to Save the product into the product_feature table.
  async addFeature() {
    try {
      // Insert query to add a new feature
      const insertQuery = `INSERT INTO product_features (featureName, featureDescription) VALUES (?, ?)`;
      const values = [this.featureName, this.featureDescription];
      // Execute the query
      const result = await executeQuery(insertQuery, values);
      // returning  the response from the database
      return result.insertId;
    } catch (error) {
      // Handle errors
      console.error("Error in adding feature:", error);
      throw error; // throw the error to be caught by the calling function
    }
  }
   // Function to find a feature by its ID
   static async findById(featureId) {
    try {
      // SQL query to find the feature by ID
      const query = `SELECT featureId, featureName ,
      featureDescription FROM product_features WHERE featureId = ?`;

      // Execute the query with the feature ID parameter
      const result = await executeQuery(query, [featureId]);
      // console.log(result);

      // If the query returns a result, return the feature object
      if (result.length > 0) {
        return result[0];
      } else {
        // If no feature found with the given ID, return null
        return null;
      }
    } catch (error) {
      // Handle any errors that occur during the database operation
      console.error('Error finding feature by ID:', error);
      throw error;
    }
  }
  // Function to update feature by ID
  static async updateFeatureById(featureId, featureName, featureDescription) {
    try {
      // Update query to update the feature
      const updateQuery = `
        UPDATE product_features
        SET featureName = ?, featureDescription = ?
        WHERE featureId = ?;
      `;
     
      // Execute the query
      const result = await executeQuery(updateQuery, [featureName, featureDescription, featureId]);
      // console.log(result);
      if (!!result && result.affectedRows > 0) {
        return true;
      } else {
        throw new Error('Error in updating feature by ID: '+error.message); 
      }
    
    } catch (error) {
      // Handle errors
      console.error('Error in updating feature by ID:', error);
      throw new Error('Error in updating feature by ID: '+error.message);
    }
  }
  static async getFeaturesByProductId(productId) {
    try {
      // Select query to get features for a specific product ID
      const selectQuery = `
        SELECT f.featureId,f.featureName,f.featureDescription 
        from productmaster as p 
        JOIN 
        productfeature_relation as pfr ON
        p.productId=pfr.productId
        JOIN 
        product_features AS f 
        ON pfr.featureId = f.featureId
        where p.productId=?
      `;

      // Execute the query
      const result = await executeQuery(selectQuery, [productId]);
      // console.log(result);

      // Extract the feature names from the result
      const features = result.map((row) => row.featureName);

      return result;
    } catch (error) {
      // Handle errors
      console.error("Error in getting features by product ID:", error);
      
      throw new Error(
        "Error in getting features by product ID: " + error.message
      );
       // throw the error to be caught by the calling function
    }
  }

  static async deleteFeatureById(featureId) {
    try {
      // SQL query to delete the feature from the productfeature_relation table
      const deleteRelationQuery = `DELETE FROM productfeature_relation WHERE featureId = ?`;

      // Execute the query with the featureId as a parameter
      await executeQuery(deleteRelationQuery, [featureId]);

      // SQL query to delete the feature from the database
      const deleteQuery = `DELETE FROM product_features WHERE featureId = ?`;

      // Execute the query with the featureId as a parameter
      const result = await executeQuery(deleteQuery, [featureId]);

      // Return the number of rows affected (should be 1 if deletion was successful)
      if (!!result && result.affectedRows > 0) {
        return true;
      } else {
        throw new Error('Error in Deleting feature by ID: '+ error.message); 
      }
    } catch (error) {
      // If an error occurs during the deletion process, throw the error
      throw new Error(
        "Error in Deleting Feature: " + error.message
      );
    }
  }
}
module.exports = Feature;
