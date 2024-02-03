const executeQuery = require("../../db/connection");
const Feature = require("../../models/product_model/feature");
const ProductImage = require("../../models/product_model/image");
const Product = require("../../models/product_model/product");
const moment=require('moment');
const Slot = require("../../models/product_model/slot");
const { combineDateTime } = require("../../common/dateFormat");
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
        slotData,
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


      // It's slot section 

      const fromDate = moment(active_fromDate);
      const toDate = moment(fromDate).add(advanceBookingDuration, 'days');
      while(fromDate.isSameOrBefore(toDate,'day') && fromDate.isSameOrBefore(active_toDate,'day')){
        console.log(fromDate);
            const parsedSlotData = JSON.parse(slotData);
            // console.log(parsedSlotData);
            for(const slot of  parsedSlotData){
              // console.log(moment(slot.fromTime, 'HH:mm').format('HH:mm:ss'));
              // const combinedDateTime = moment(`${fromDate.format('YYYY-MM-DD')} ${slot.fromTime}`, 'YYYY-MM-DD HH:mm');

              const formattedFromTime = combineDateTime(fromDate, slot.fromTime);
              const formattedtoTime = combineDateTime(fromDate, slot.toTime);
              // console.log(formattedFromTime);
              const newslot=new Slot(fromDate.format('YYYY-MM-DD'),formattedFromTime,formattedtoTime,slot.capacity,slot.price,1);
              const slotId =await newslot.addSlot();
              console.log(slotId);
            }
        fromDate.add(1,'day');
      }




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

      // If it's an unexpected error, send a generic error response
      res.status(500).json({ Status: false, msg: 'Error in Adding Product : '+ error.message });
    
    }
  },
};
module.exports = ProductController;
