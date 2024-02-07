var express = require('express');
var router = express.Router();
var ProductController = require("../../controllers/product_controller/productController");
const validateProduct = require('../../middlewares/validateProduct');
const productImagesUpload = require('../../middlewares/productImagesUpload');


/* 
POST /add-product:
  - Description: Endpoint for adding a new product.
  - Body Type: multipart/form-data
  - Request Body Parameters:
    - productName: string (required) - The name of the product.
    - productDescription: string (required) - The description of the product.
    - advanceBookingDuration: number (required) - The advance booking duration for the product.
    - active_fromDate: string (required) - The start date for the product's availability (Format: 'yyyy-mm-dd').
    - active_toDate: string (required) - The end date for the product's availability (Format: 'yyyy-mm-dd').
    - productCapacity: number (required) - The capacity of the product.
    - featureData: string (required) - JSON string representing feature data.
      Example: 
      [
        { "name": "Latest Ac19 ", "description": "We have the world's best AC, which is 0.1 ton." },
        { "name": "Mast Full speed 5g+ Wifi", "description": "Enjoy high-speed internet with 1GB/s during your booking." }
      ]
    - slotData: string (optional) - JSON string representing slot data.
      Example:
      [
        { "fromTime": "09:30", "toTime": "10:00", "capacity": 10, "price": 50 },
        { "fromTime": "12:30", "toTime": "15:30", "capacity": 15, "price": 600 },
      ]
    - bookingCategory: string (optional) - The booking category for the product.
    - productImages: array of files (optional) - Images representing the product.
    - bookingCategory: string (required) - The booking category for the product. Possible values: 'slot' or 'dayWise'.
*/
router.post('/add-product',productImagesUpload, ProductController.addProduct);

/* 
 PUT /update-feature/:id:
  -Description: Endpoint for updating a feature by its ID.
  - Body Type: JSON
  - Request Parameters:
    - id: string (required) - The ID of the feature to be updated.
  - Request Body Parameters:
    - name: string (required) - The updated name of the feature.
    - description: string (required) - The updated description of the feature.
 */
router.put('/update-feature/:id',ProductController.updateFeature );

/* 
 POST /add-feature:
  - Description: Endpoint for adding a new feature to a product.
  - Body Type: JSON
  - Request Body Parameters:
    - featureData: array (required) - Array of feature objects to be added to the product.
    - productId: string (required) - The ID of the product to which features are to be added.
 */
router.post('/add-feature', ProductController.addFeature);
/* 
 DELETE /delete-product/:id:
  - Description: Endpoint for deleting a feature by its ID.
  - Body Type: None
  - Request Parameters:
    - id: string (required) - The ID of the feature to be deleted.
 */
router.delete('/delete-feature/:id', ProductController.deleteFeatureById);

router.delete('/delete-image/:id', ProductController.deleteImageById);

router.get('/add-image',productImagesUpload,ProductController.addProductImage);

router.get('/getProduct', (req,res)=>{
    res.status(200).send("Jay sheree Ram");
});



module.exports = router;
