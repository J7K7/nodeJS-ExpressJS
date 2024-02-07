const executeQuery = require("../../db/connection");
const Feature = require("../../models/product_model/feature");
const ProductImage = require("../../models/product_model/image");
const Product = require("../../models/product_model/product");
const moment = require("moment");
const Slot = require("../../models/product_model/slot");
const path = require("path");
const fs = require("fs");
const { combineDateTime } = require("../../common/dateFormat");
const {
  productDetailsValidation,
  slotValidation,
  featureValidation,
} = require("../../common/validations");
const { log } = require("console");
const maxImagesPerProduct = process.env.MAX_IMAGES_PER_PRODUCT;

const ProductController = {
  addProduct: async (req, res) => {
    try {
      const {
        productName,
        productDescription,
        advanceBookingDuration,
        active_fromDate,
        active_toDate,
        productCapacity,
        featureData,
        slotData,
        bookingCategory,
      } = req.body;

      //Validate basic details of product
      const productValidationResult = productDetailsValidation(
        productName,
        productDescription,
        advanceBookingDuration,
        active_fromDate,
        active_toDate,
        productCapacity,
        featureData,
        slotData,
        bookingCategory
      );
      if (!productValidationResult.isValid) {
        return res
          .status(400)
          .json({ Status: false, msg: productValidationResult.message });
      }

      // Validate slot data
      const parsedSlotData = JSON.parse(slotData);
      const slotValidationResult = slotValidation(
        parsedSlotData,
        bookingCategory
      );
      if (!slotValidationResult.isValid) {
        return res
          .status(400)
          .json({ Status: false, msg: slotValidationResult.message });
      }

      // Validate feature data
      // parse the Data into  json format
      const parsedFeatureData = JSON.parse(featureData);
      const featureValidationResult = featureValidation(parsedFeatureData);
      if (!featureValidationResult.isValid) {
        return res
          .status(400)
          .json({ Status: false, msg: featureValidationResult.message });
      }
      console.log("Product Successfully verified");

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

      if (!productId) {
        return res
          .status(401)
          .send({ Status: false, msg: "Failed to create a new product" });
      }

      // Storing the features of the product into product_features table and Linking with product id.
      const featureRelationResult = await Product.linkProductWithFeatures(
        productId,
        parsedFeatureData
      );
      // console.log(());

      let imagePaths = [];
      var imagesSaved = true;
      // Check if files were uploaded in the request
      if (req.files && req.files.length > 0) {
        // console.log(req.files);
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

      // It's slot section

      const slotResult = await newproduct.addInitialSlots(
        productId,
        active_fromDate,
        active_toDate,
        advanceBookingDuration,
        slotData,
        bookingCategory
      );
      // console.log(slotResult);
      // const testing= await Feature.getFeaturesByProductId(productId)
      // console.log("data",testing);
      res.status(201).json({
        productId,
        featureRelationResult,
        imagesSaved,
        slotResult,
        Status: true,
        msg: "Product has been added successfully",
      });
    } catch (error) {
      // Handle the error thrown by the middleware or any other errors
      console.error("Error in addProduct:", error);

      // If it's an unexpected error, send a generic error response
      res.status(500).json({
        Status: false,
        msg: "Error in Adding Product : " + error.message,
      });
    }
  },
  updateFeature: async (req, res) => {
    try {
      const featureId = req.params.id;
      const { name, description } = req.body;
      // console.log(req.params.id);
      // Check if the provided ID is valid (e.g., is a positive integer)
      if (!Number.isInteger(Number(featureId)) || Number(featureId) <= 0) {
        return res
          .status(400)
          .json({
            Status: false,
            msg: "Invalid feature ID. Please Provide in positive Integer Format",
          });
      }

      // Check if at least one field is provided
      if (!name || !description) {
        return res.status(400).json({
          Staus: false,
          msg: "Plaese Provide The feature name And description for feature Update",
        });
      }
      const result = await Feature.updateFeatureById(
        featureId,
        name,
        description
      );

      res
        .status(200)
        .json({ Status: true, message: "Feature updated successfully" });
    } catch (error) {
      if (error.message.includes("error is not defined")) {
        console.error("Error in Updating Invalid Feature Id", error);
        return res
          .status(400)
          .json({ Status: false, msg: "Invalid FeatureId: " });
      }
      console.error("Error updating feature:", error);
      res.status(500).json({
        Status: false,
        msg: "Internal Server Error: " + error.message,
      });
    }
  },
  addFeature: async (req, res) => {
    try {
      const { featureData, productId } = req.body;

      // Validate input data
      const featureValidationResult = featureValidation(featureData);
      if (!featureValidationResult.isValid) {
        return res
          .status(400)
          .json({ Status: false, msg: featureValidationResult.message });
      }

      const product = await Product.findProductById(productId);
      // console.log(product);
      if (!product) {
        return res
          .status(404)
          .json({ Status: false, msg: "No Product Found with given ID." });
      }

      // Create a new feature and linking It with productId By calling the linkProductWithFeatures function
      const featureRelationResult = await Product.linkProductWithFeatures(
        productId,
        featureData
      );
      // console.log(featureRelationResult);
      return res
        .status(201)
        .send({ Status: true, msg: "Features has been added successfully" });
    } catch (error) {
      console.error("Error adding feature:", error);
      res.status(500).json({
        Status: false,
        msg: "Error in Adding Feature : " + error.message,
      });
    }
  },
  deleteFeatureById: async (req, res) => {
    // Extract the feature ID from the request parameters
    const featureId = req.params.id;

    try {
      // Call the deleteFeatureById method from the Feature model
      if (!featureId) {
        return res.status(404).json({ Status: false, msg: "Inavalid request" });
      }
      // Validate that featureId is number
      if (!Number.isInteger(Number(featureId)) || Number(featureId) <= 0) {
        return res
          .status(400)
          .json({
            Status: false,
            msg: "Invalid feature ID. Please Provide in positive Integer Format",
          });
      }

      const result = await Feature.deleteFeatureById(featureId);
      res
        .status(200)
        .json({ Status: true, msg: "Feature deleted successfully." });
    } catch (error) {
      // If an error occurs during the deletion process, send an error response
      if (error.message.includes("error is not defined")) {
        console.error("Error in Updating Invalid Feature Id", error);
        return res
          .status(400)
          .json({ Status: false, msg: "Invalid FeatureId: " });
      }
      console.error("Error updating feature:", error);
      res.status(500).json({
        Status: false,
        msg: "Internal Server Error: " + error.message,
      });
    }
  },
  deleteImageById: async (req, res) => {
    // Extract the image ID from the request parameters
    const imageId = req.params.id;

    try {
      // Validate the image ID
      if (!imageId) {
        return res.status(404).json({ Status: false, msg: "Invalid request." });
      }
      // Validate that imageId is a positive integer
      if (!Number.isInteger(Number(imageId)) || Number(imageId) <= 0) {
        return res
          .status(400)
          .json({
            Status: false,
            msg: "Invalid image ID. Please provide a positive integer.",
          });
      }

      // Call the deleteImageById method from the Image model
      const result = await ProductImage.deleteImageById(imageId);
      return res
        .status(200)
        .json({ Status: true, msg: "Image deleted successfully." });
    } catch (error) {
      console.error("Error deleting image by ID:", error);
      return res
        .status(500)
        .json({
          Status: false,
          msg: "Internal Server Error: " + error.message,
        });
    }
  },
  addProductImage: async (req, res) => {
    const productId = req.body.productId;

    try {
      // Check if request body contains productId and image file
      if (!req.body.productId || !(req.files && req.files.length > 0)) {
        return res
          .status(400)
          .json({
            Status: false,
            msg: "Product ID and image file are required.",
          });
      }
      //Counting Exiting Images Count
      const existingImagesCount = await ProductImage.getImageCountForProduct(productId);
      const totalImageCount = existingImagesCount + req.files.length;
      // console.log(totalImageCount);
      // If the number of images for this product already reaches the maximum limit, reject the request
      if (totalImageCount > maxImagesPerProduct) {
         // Remove uploaded images from the local directory
         for (const file of req.files) {
          // console.log(file);
          fs.unlinkSync(file.path);
          //This can be also used;
          // fs.unlinkSync(path.join(__dirname, "../../public/images/product", file.filename));
        }
        return res.status(403).json({ 
          Status: false,
          msg: `The product can only have a total maximum of ${maxImagesPerProduct} images.`
         })
      }

      // Extract filenames from the uploaded files and store in imagePaths array
      imagePaths = req.files.map((file) => ({
        filename: file.filename,
      }));
      // Call the linkProductWithImages function to link images with the product
      imagesSaved = await Product.linkProductWithImages(
        productId,
        imagePaths
      );
  
      // Send a success response
      res.status(200).json({ Status: true, msg: "Image added successfully." });
    } catch (error) {
      // Handle errors
      console.error("Error adding image:", error);
      res
        .status(500)
        .json({
          Status: false,
          msg: "Internal server error.: " + error.message,
        });
    }
  },
};

module.exports = ProductController;
