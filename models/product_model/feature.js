const executeQuery = require("../../db/connection");

// This is the Model for the productMaster Table .
class Feature {

    constructor(featureName,featureDescription){
        this.featureName= featureName;
        this.featureDescription = featureDescription  ;  
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
      console.error('Error in adding feature:', error);
      throw error; // throw the error to be caught by the calling function
    }
  }
}
module.exports = Feature;