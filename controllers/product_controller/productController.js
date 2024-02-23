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
const { all } = require("../../routes/product_routes/productRoutes");
const ProductAllDetails = require("../../models/product_model/productAllDetails");
const BookingsMaster = require("../../models/booking_model/bookingsMaster");
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
        bookingCategoryId,
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
        bookingCategoryId
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
        bookingCategoryId
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
      //Validating that Product with same name is exist or not  in database 
      const productCnt=await Product.findProductCountByName(productName);
      if(productCnt>0){
        return res
          .status(409)
          .json({ Status: false, msg:`Product With This ${productName} name already exists.` });
      }

      console.log("Product Successfully verified");

      //creating instance of Product Class
      const newproduct = new Product(
        productName,
        productDescription,
        advanceBookingDuration,
        active_fromDate,
        active_toDate,
        productCapacity,
        slotData
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
        imagesSaved = await Product.linkProductWithImages(
          productId,
          imagePaths
        );
      }
      // imagesSaved variable now holds the result of linking images with the product

      // It's slot section

      const slotResult = await Product.addInitialSlots(
        productId,
        active_fromDate,
        active_toDate,
        advanceBookingDuration,
        slotData,
        bookingCategoryId
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
  getAllProductsWithImagesandFeature: async (req, res) => {
    try {
      // Query your database to fetch all product details
      const allProductDetails =
        await Product.getAllProductDetailsWithImagesAndFeatures();

      // Organize the retrieved data into the desired format
      // console.log(allProductDetails)
      const productsData = {};
      allProductDetails.forEach((row) => {
        const productId = row.productId;
        if (!productsData[productId]) {
          const {
            productId,
            productName,
            advanceBookingDuration,
            active_fromDate,
            active_toDate,
          } = row;
          productsData[productId] = new ProductAllDetails(
            productId,
            productName,
            advanceBookingDuration,
            active_fromDate,
            active_toDate
          );
        }
        if (row.imageId && !productsData[productId].hasImage(row.imageId)) {
          productsData[productId].addImage(row.imageId, row.imagePath);
        }
        if (
          row.featureId &&
          !productsData[productId].hasFeature(row.featureId)
        ) {
          productsData[productId].addFeature(
            row.featureId,
            row.featureName,
            row.featureDescription
          );
        }
      });

      // Convert the product objects to an array
      const productsArray = Object.values(productsData);

      // Return the result
      res.status(200).json({ Status: true, productsData: productsArray });
    } catch (error) {
      console.error("Error fetching product details:", error);
      res.status(500).json({
        Status: false,
        msg: "Internal server error: " + error.message,
      });
    }
  },
  getProductDetailsById: async (req, res) => {
    const productId = req.params.id;

    try {
      // Call the function to fetch product details by ID
      const productDetails = await Product.getProductDetailsById(productId);

      // If productDetails is null or undefined, the product doesn't exist
      if (!productDetails) {
        return res
          .status(404)
          .json({ Status: false, msg: "Product not found." });
      }
      // Create an object to store product details

      // Created the Instance of Product Details class and add data in it.
      const {
        productName,
        advanceBookingDuration,
        active_fromDate,
        active_toDate,
      } = productDetails[0];
      const productData = new ProductAllDetails(
        productId,
        productName,
        advanceBookingDuration,
        active_fromDate,
        active_toDate
      );

      productDetails.forEach((row) => {
        // const productId = row.productId;

        // Add image if it doesn't exist already
        if (!productData.hasImage(row.imageId)) {
          productData.addImage(row.imageId, row.imagePath);
        }

        // Add feature if it doesn't exist already
        if (!productData.hasFeature(row.featureId)) {
          productData.addFeature(
            row.featureId,
            row.featureName,
            row.featureDescription
          );
        }
      });
      // console.log(productDetails);

      // return productDetails;
      res.status(200).json({ Status: true, productData });
    } catch (error) {
      console.error("Error fetching product details:", error);
      res.status(500).json({
        Status: false,
        msg: "Internal server error : " + error.message,
      });
    }
  },
  updateProductStatusById:async (req,res)=>{
    // For updating the status of the  product by id.
    const productId = req.params.id;
    const { status } = req.body; // status: 1 for activate, 0 for deactivate

    try {
      // Check if the status is provided
      if (status == null) {
        return res.status(400).json({
          Status: false,
          msg: "Please provide the new status of the product.",
        });
      }

      // Validate the product ID
      if (!Number.isInteger(Number(productId)) || Number(productId) <= 0) {
        return res.status(400).json({
          Status: false,
          msg: "Invalid product ID. Please provide a positive integer.",
        });
      }

      // Update the product status by its ID
      const result = await Product.updateProductStatusById(productId, status);

      // Send success response
      return res.status(200).json({
        Status: true,
        msg: `Product ${status==1 ? "activated" : "deactivated"} successfully.`,
      });
    }catch (error) {
      // Handle errors
      if (error.message.includes("error is not defined") || error.message.includes("Product not found")) {
        console.error("Error in updating Invalid Product Id", error);
        return res
          .status(400)
          .json({ Status: false, msg: "Invalid ProductId: " });
      }
      console.error("Error updating product status:", error);
      return res.status(500).json({
        Status: false,
        msg: "Internal Server Error: " + error.message,
      });
    }
  },
  deleteProductById: async (req,res)=>{
    // Extract the Product ID from the request parameters
    const productId = req.params.id;

    try {
      // Validate the product ID
      if (!productId) {
        return res.status(404).json({ Status: false, msg: "Invalid request." });
      }
      // Validate that productId is a positive integer
      if (!Number.isInteger(Number(productId)) || Number(productId) <= 0) {
        return res.status(400).json({
          Status: false,
          msg: "Invalid product ID. Please provide a positive integer.",
        });
      }

      // First we check the if any current confirm booking for this productId is there or not?
      const bookingIds = await BookingsMaster.findAllConfirmBookingsByProductId(productId);
      
      // If yes then send the bookingId's and Message that You can not delete this  product because it has been assigned to some users.
      // Check if the product has any associated bookings
      if (bookingIds && bookingIds.length > 0) {
        // If bookings exist, return a conflict response with booking details
        return res.status(409).json({
          Status: false,
          msg: `Cannot delete the product because it has bookings.`,
          bookingIds: bookingIds
        });
      }

      // Delete the product using the product ID
      const result = await Product.deleteProductById(productId);
      return res
        .status(200)
        .json({ Status: true, msg: "product deleted successfully." });
    } catch (error) {
      // Handle errors
      if (error.message.includes("error is not defined") || error.message.includes("Product not found")) {
        console.error("Error in Deleting Invalid Product Id", error);
        return res
          .status(400)
          .json({ Status: false, msg: "Invalid ProductId: " });
      }
      console.error("Error deleting product:", error);
      return res.status(500).json({
        Status: false,
        msg: "Internal Server Error: " + error.message,
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
        return res.status(400).json({
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
      console.log(req.body);
      const parsedFeatureData=JSON.parse(featureData)
      // Validate input data
      const featureValidationResult = featureValidation(parsedFeatureData);
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
        parsedFeatureData
      );
      // console.log(featureRelationResult);
      return res
        .status(201)
        .send({ Status: true, msg: "Features has been added successfully" });
    } catch (error) {
      if (error.message.includes("error is not defined") || error.message.includes("Product not found")) {
        console.error(" Invalid Product Id", error);
        return res
          .status(400)
          .json({ Status: false, msg: "Invalid ProductId: " });
      }
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
        return res.status(400).json({
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
        return res.status(400).json({
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
      return res.status(500).json({
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
        return res.status(400).json({
          Status: false,
          msg: "Product ID and image file are required.",
        });
      }
      //Counting Exiting Images Count
      const existingImagesCount = await ProductImage.getImageCountForProduct(
        productId
      );
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
          msg: `The product can only have a total maximum of ${maxImagesPerProduct} images.`,
        });
      }

      // Extract filenames from the uploaded files and store in imagePaths array
      imagePaths = req.files.map((file) => ({
        filename: file.filename,
      }));
      // Call the linkProductWithImages function to link images with the product
      imagesSaved = await Product.linkProductWithImages(productId, imagePaths);

      // Send a success response
      res.status(200).json({ Status: true, msg: "Image added successfully." });
    } catch (error) {
      // Handle errors
      console.error("Error adding image:", error);
      res.status(500).json({
        Status: false,
        msg: "Internal server error.: " + error.message,
      });
    }
  },
  addSingleSlotByProductId : async (req, res) => {
    //Adding new slot for particular product mostly applicable for bookingCategory 1 (slotBased)
    const {
      slotDate,
      slotFromDateTime,
      slotToDateTime,
      slotOriginalCapacity,
      slotPrice,
      bookingCategoryId,
    } = req.body;
    // console.log(req);
    const productId = req.params.id;
    try {
      // Check if required parameters are provided and apply slotValidations
      const slotData = {
        date:slotDate,
        price: slotPrice,
        capacity: slotOriginalCapacity,
        fromTime: slotFromDateTime,
        toTime: slotToDateTime,
      };
      // passing slotData in array form beacause slot validation take slotData in array form  only
      const slotValidationResult = slotValidation(
        [slotData],
        bookingCategoryId
      );
      if (!slotValidationResult.isValid)  {
        return res
          .status(400)
          .json({ Status: false, msg: slotValidationResult.message });
      }
      if(!moment(slotDate, 'YYYY-MM-DD', true).isValid()){
        return res .status(400).json({msg:"Invalid Slot date format please use YYYY/MM/DD", Status: false});
      }
      // Validate the ProductId is Valid Or not ?
      const product = await Product.findProductById(productId);
        // Call the addSingleSlotByProductId method from the Slot model
      const newSlot = await Slot.addSingleSlotByProductId(productId, slotData);

        // Send a success response
      return res.status(201).json({ Status: true, msg: 'Slot added successfully', data: newSlot });
    } catch (error) {
      // Handle errors
      if (error.message.includes("error is not defined") || error.message.includes("Product not found")) {
        console.error(" Invalid Product Id", error);
        return res
          .status(400)
          .json({ Status: false, msg: "Invalid ProductId: " });
      }
      console.error("Error in adding product:", error);
      return res.status(500).json({
        Status: false,
        msg: "Internal Server Error: " + error.message,
      });
    }
  },
  updateSlotById: async (req, res) => {
    // console.log(req)
    const {
      slotFromDateTime,
      slotToDateTime,
      slotOriginalCapacity,
      slotPrice,
      bookingCategoryId,
    } = req.body;
    const slotId = req.params.id;
    try {
      // Check if required parameters are provided and apply slotValidations
      const slotData = {
        price: slotPrice,
        capacity: slotOriginalCapacity,
        fromTime: slotFromDateTime,
        toTime: slotToDateTime,
      };
      // passing slotData in array form beacause slot validation take slotData in array form  only
      const slotValidationResult = slotValidation(
        [slotData],
        bookingCategoryId
      );
      if (!slotValidationResult.isValid) {
        return res
          .status(400)
          .json({ Status: false, msg: slotValidationResult.message });
      }

      // Validate the provided slot ID
      if (!Number.isInteger(Number(slotId)) || Number(slotId) <= 0) {
        return res.status(400).json({
          Status: false,
          msg: "Invalid slot ID. Please provide a positive integer.",
        });
      }
      

      // Call the updateSlotById method from the Slot model
      const result = await Slot.updateSlotById(
        slotId,
        slotData,
        bookingCategoryId
      );

      // Send a success response
      res.status(200).json({ Status: true, msg: "Slot updated successfully. Please note that the changes will only affect new bookings. Existing bookings remain unchanged." });
    } catch (error) {
      // Handle errors
      if (
        error.message.includes("error is not defined") ||
        error.message.includes("Slot not found")
      ) {
        console.error("Error in Updating Invalid Slot Id", error);
        return res.status(400).json({ Status: false, msg: "Invalid SlotId: " });
      }
      console.error("Error updating Slot:", error);
      res.status(500).json({
        Status: false,
        msg: "Internal Server Error: " + error.message,
      });
    }
  },
  updateSlotStatusById: async (req, res) => {
    const slotId = req.params.id;
    const { status } = req.body; // status: 1 for activate, 0 for deactivate

    try {
      // Activate or deactivate the slot by its ID
      if (status == null) {
        return res.status(400).json({
          Status: false,
          msg: "Please Provide the new status of the slot",
        });
      }

      if (!Number.isInteger(Number(slotId)) || Number(slotId) <= 0) {
        return res.status(400).json({
          Status: false,
          msg: "Invalid slot ID. Please provide a positive integer.",
        });
      }

      const result = await Slot.updateSlotStatusById(slotId, status);

      // Send success response
      return res.status(200).json({
        Status: true,
        msg: `Slot ${status==1 ? "activated" : "deactivated"} successfully. This Changes Applicable for upcoming Bookings this not reflect in current Bookings`,
      });
    } catch (error) {
      // Handle errors
      return res.status(500).json({
        Status: false,
        msg: `Failed to ${status==1 ? "activate" : "deactivate"} slot. : `+error.message ,
      });
    }
  },

  deleteSlotById: async (req, res) => {
    // In this function we are deleting entire booking if any particular slot is deleting 
    // This Function is created using the keeping this assumptions.
    // 1. When admin try to delete the slot then all the bookings related to that slot should be cancelled.
    // 2. In bookings it's include if let's take example that the if one booking contain the below booking
    //    details - Booked products:  Product 1 => slotIds: 101,102,103 
    //                                prodcuct 2 => slotIds: 201,202
    //    In this case if admin try to delete the any of the above mentioned slot than entire booking gets cancelled.

    //  3. If Any Ongoing Booking is there than the we can not cancel that booking but delete the slot and keep remain this ongoing booking and cancel allother bookings
    //              Means that if today is 20th date than i try delete slotId 105(21st) a
    //              current booking is there which is from  18th to 22 than we can not cancel this booking and only delete the slot.(We have all the data related that slot is already in the bookProduct Table)                            
    //  Same rule for when single booking contain the multiple slotIds.
    // So in short when ever we will delete the slot then first check whether there is any booking Than we cancel all the future Booking(booking_FromDate > currentDateTime) and delete the slot.
    
    let slotId = req.params.id;
    const { message,bookingCategoryId } = req.body;

    try {
      // Validation checks
      
      // Check if there is no message provided
      if (!message) {
        // If the above condition is true, return a bad request response with a message
        return res.status(400).json({
          Status: false, // Indicates the status of the request
          msg: "Please provide a message for cancelling booked slots.", // The error message to be sent to the client
        });
      }
    
      // In this if any ongoing booking is there than we can not cancel it.
      // So for that we comparing the bookingFromDateTime with the current date if it is greater than this than we can delete that bookings.
          
        const futureConfirmedBookingIds = await BookingsMaster.findAllFutureConfirmBookingsBySlotId(slotId);
        if(futureConfirmedBookingIds.length>0){
          
          //  Cancel the bookings with the given bookingIds and update their status to 'cancelledByAdmin'(statusId:6)
          // Also decreasing the bookedSlot in slotmaster table.
           const updateStatus = await BookingsMaster.cancelBookingsByAdmin(futureConfirmedBookingIds,6,message);
           console.log(updateStatus);
        }
        console.log(futureConfirmedBookingIds);
      // Call the deleteSlot method from the SlotMaster class to delete the slot based upon the slot Id that was passed as an argument
      // Delete the Slot from DB
      // const deletedSlot = await Slot.deleteSlotById(slotId);
      // Return a success response
      return res.status(200).json({
        Status: true,
        cancelledBookingIds: futureConfirmedBookingIds,//deletedSlot.data ? [deletedSlot.data.id] : [],
        msg: futureConfirmedBookingIds.length > 0 ? "All bookings for the slot have been cancelled Except the OnGoing Bookings and Slot Successfully Deleted! So no more Booking for this slot can happen!!" : "Slot successfully deleted! No more bookings for this slot can happen.",
      });
  
    } catch (error) {
      if (
        error.message.includes("error is not defined") ||
        error.message.includes("Slot not found")
      ) {
        console.error("Error in Deleting, Invalid Slot Id", error);
        return res.status(404).json({ Status: false, msg: "Invalid SlotId" });
      }
      console.error("Error deleting SlotById:", error);
      res.status(500).json({
        Status: false,
        msg: "Internal Server Error: " + error.message,
      });
    }
  },
};

module.exports = ProductController;
