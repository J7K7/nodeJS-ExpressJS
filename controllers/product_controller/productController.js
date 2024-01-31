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
            } = req.body;
        
            const newproduct = new Product(
              productName,
              productDescription,
              advanceBookingDuration,
              active_fromDate,
              active_toDate,
              productCapacity
            );
        
            const productId = await newproduct.save();
            console.log(productId);
        
            res.status(201).json({ productId ,Status:true, msg:"Product has been added successfully"});
          } catch (error) {
            console.error('Error adding product:', error);
            res.status(500).json({ error: 'Internal Server Error' });
          }
    }
}
module.exports =ProductController;