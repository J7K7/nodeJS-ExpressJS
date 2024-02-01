const executeQuery = require("../../db/connection");
const Feature = require("../../models/product_model/feature");
const Product = require("../../models/product_model/product");
const ProductController = {
    addProduct: async (req,res)=>{
        try {
            const {
              productName,
              productDescription,
              advanceBookingDuration,
              active_fromDate,
              active_toDate,
              productCapacity,
              featureData
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
            if (!productId) return res.status(401).send({ Status : false , msg:"Failed to create a new product"});
            //Storing the features of the product into product_features table and Linking with product id.
            const relationResult= await newproduct.linkProductWithFeatures(productId,featureData);
            
          
            res.status(201).json({ productId,relationResult ,Status:true, msg:"Product has been added successfully"});
          } catch (error) {
            console.error('Error adding product:', error);
            res.status(500).json({Success:false, msg: error.message });
          }
    }
}
module.exports =ProductController;