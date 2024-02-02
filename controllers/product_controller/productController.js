const executeQuery = require("../../db/connection");
const Feature = require("../../models/product_model/feature");
const ProductImage = require("../../models/product_model/image");
const Product = require("../../models/product_model/product");
const ProductController = {
  addProduct: async (req, res) => {
    console.log("hello");
    try {
      const {
        productName,
        productDescription,
        advanceBookingDuration,
        active_fromDate,
        active_toDate,
        productCapacity,
        featureData,
      } = req.body;
      //creating instance of Product Class
      const newproduct = new Product(
        productName,
        productDescription,
        advanceBookingDuration,
        active_fromDate,
        active_toDate,
        productCapacity
      );
      // Storing The product info into product Master
      const productId = await newproduct.saveProduct();

      if (!productId)
        return res
          .status(401)
          .send({ Status: false, msg: "Failed to create a new product" });

      // parse the Data into  json format and push it in features array of product class

      const parsedFeatureData = JSON.parse(featureData);
      // Storing the features of the product into product_features table and Linking with product id.
      const featureRelationResult = await newproduct.linkProductWithFeatures(
        productId,
        parsedFeatureData
      );
      // console.log(());

      let imagePaths = [];
      var imagesSaved = true;
      // Check if files were uploaded in the request
      if (req.files && req.files.length > 0) {
        // Extract filenames from the uploaded files and store in imagePaths array
        imagePaths = req.files.map((file) => ({
          filename: file.filename,
        }));
        // Call the linkProductWithImages function to link images with the product
        imagesSaved = await newproduct.linkProductWithImages(
          productId,
          imagePaths
        );
      }
      // imagesSaved variable now holds the result of linking images with the product

      res.status(201).json({
        productId,
        featureRelationResult,
        imagesSaved,
        Status: true,
        msg: "Product has been added successfully",
      });
    } catch (error) {
      // Handle the error thrown by the middleware or any other errors
    console.error('Error in addProduct:');

    if (error.status==400 && error.message) {
      // If the error has a status code and a message, send a custom response
      res.status(error.status).json({ success: false, message: error.message });
    } else {
      // If it's an unexpected error, send a generic error response
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
    }
  },
};
module.exports = ProductController;
