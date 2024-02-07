const executeQuery = require("../../db/connection");
const path = require("path");
const fs = require("fs");
class ProductImage {
  constructor(imagePath) {
    this.imagePath = imagePath;
  }
  async addProductImage() {
    try {
      // const timestamp = Date.now();
      const insertQuery = "INSERT INTO productImages (imagePath) VALUES (?)";
      const values = [this.imagePath];

      const result = await executeQuery(insertQuery, values);
      // returning  the response from the database
      // console.log(result);
      return result.insertId; // Return the ID of the newly inserted image
    } catch (error) {
      console.error("Error saving product image:", error);
      throw error;
    }
  }
  static async deleteImageById(imageId) {
    try {
      // SQL query to get the image file path
      const selectQuery = `SELECT imagePath FROM productimages WHERE imageId = ?`;
      // Execute the query to get the image path
      const imageInfo = await executeQuery(selectQuery, [imageId]);
      // Check if the image exists
      if (imageInfo.length === 0) {
        throw new Error("Image not found.");
      }
      // Get the image file path from the database result
      const imagePath = imageInfo[0].imagePath;
      //   console.log(imagePath)

      // Delete the image file from the local storage
      fs.unlinkSync(
        path.join(__dirname, "../../public/images/product", imagePath)
      );

      // Delete the entries related to the image from the productImage_relation table
      const deleteRelationQuery = `DELETE FROM productImage_relation WHERE imageId = ?`;
      await executeQuery(deleteRelationQuery, [imageId]);
      if (deleteRelationQuery.affectedRows === 0) {
        throw new Error("Failed to delete image record.");
      }

      // SQL query to delete the image record from the database
      const deleteQuery = `DELETE FROM productimages WHERE imageId = ?`;
      // Execute the query to delete the image record
      const result = await executeQuery(deleteQuery, [imageId]);

      // Check if the image record was deleted successfully
      if (result.affectedRows === 0) {
        throw new Error("Failed to delete image record.");
      }
    } catch (error) {
      console.error("Error deleting image by ID:", error);
      throw error;
    }
  }
  static async getImageCountForProduct(productId) {
    try {
      // SQL query to count images associated with the product
      const countQuery = `SELECT COUNT(*) AS imageCount FROM productImage_relation WHERE productId = ?`;

      // Execute the query with productId as parameter
      const result = await executeQuery(countQuery, [productId]);

      // Extract the image count from the query result
      const imageCount = result[0].imageCount;

      return imageCount;
    } catch (error) {
      // Handle errors, such as database query errors
      throw new Error(`Error retrieving image count for product: ${error.message}`);
    }
  }
}
module.exports = ProductImage;
