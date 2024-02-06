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
}
module.exports = Feature;
