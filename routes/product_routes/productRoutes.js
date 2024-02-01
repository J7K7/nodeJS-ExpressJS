var express = require('express');
var router = express.Router();
var ProductController = require("../../controllers/product_controller/productController");
const validateProduct = require('../../middlewares/validateProduct');


router.post('/addProduct',validateProduct, ProductController.addProduct);
router.get('/getProduct', (req,res)=>{
    res.status(200).send("Jay sheree Ram");
});



module.exports = router;
