const fs = require( 'fs' );
const ProductAllDetails = require('../models/product_model/productAllDetails');
const moment = require("moment");

// This is generalProductDetails Query this is used for getting productDetails from different Tables so for apply different codition you can use this query.
// use below name pm for productmaster etc.. 
function generalProductDetailsQuery() {
    return `
        SELECT
            pm.productId,
            pm.productName,
            pm.productDescription,
            pm.advanceBookingDuration,
            pm.active_fromDate,
            pm.active_toDate,
            pm.productCapacity,
            pi.imageId,
            pi.imagePath,
            pf.featureId,
            pf.featureName,
            pf.featureDescription
        FROM
            productmaster AS pm
        LEFT JOIN
            productImage_relation AS pir ON pm.productId = pir.productId
        LEFT JOIN
            productimages AS pi ON pir.imageId = pi.imageId
        LEFT JOIN
            productfeature_relation AS pfr ON pm.productId = pfr.productId
        LEFT JOIN
            product_features AS pf ON pfr.featureId = pf.featureId
    `;
}


// This is through object  destructuring. This is used in intial stage but for particular order we are using map But this is for future need if any need.
function organizeProductDetails(allProductDetails) {
    const productsData = {};

    allProductDetails.forEach((row) => {
        const productId = row.productId;
        if (productId && !productsData[productId]) {
            const {
                productId,
                productName,
                productDescription,
                advanceBookingDuration,
                active_fromDate,
                active_toDate,
            } = row;
            productsData[productId] = new ProductAllDetails(
                productId,
                productName,
                productDescription,
                advanceBookingDuration,
                moment(active_fromDate).format("YYYY-MM-DD"),
                moment(active_toDate).format("YYYY-MM-DD")
            );
        }
        if (row.imageId && !productsData[productId].hasImage(row.imageId)) {
            productsData[productId].addImage(row.imageId, row.imagePath);
        }
        if (row.featureId && !productsData[productId].hasFeature(row.featureId)) {
            productsData[productId].addFeature(
                row.featureId,
                row.featureName,
                row.featureDescription
            );
        }
    });

    // Convert the product objects to an array
    const productsArray = Object.values(productsData);
    
    return productsArray;
}
// this is implemented using the map for getting element in particular order which they are comes from data base 
function organizeProductDetailsMap(allProductDetails) {
    const productsMap = new Map();

    allProductDetails.forEach((row) => {
        const productId = row.productId;
        if (!productsMap.has(productId)) {
            const newProduct = new ProductAllDetails(
                productId,
                row.productName,
                row.productDescription,
                row.advanceBookingDuration,
                moment(row.active_fromDate).format("YYYY-MM-DD"),
                moment(row.active_toDate).format("YYYY-MM-DD")
            );
            productsMap.set(productId, newProduct);
        }
        // Check if image exists and add only if it's new
        if (row.imageId) {
            const product = productsMap.get(productId);
            if (!product.hasImage(row.imageId)) {
                product.addImage(row.imageId, row.imagePath);
            }
        }
        // Check if feature exists and add only if it's new
        if (row.featureId) {
            const product = productsMap.get(productId);
            if (!product.hasFeature(row.featureId)) {
                product.addFeature(row.featureId, row.featureName, row.featureDescription);
            }
        }
        // Add slot details (if needed)
        // product.addSlot(...);
    });

    // Convert the map values to an array (if order is required)
    const productsArray = Array.from(productsMap.values());

    return productsArray;
}

// Not using below function in this project  but keeping for future reference
const removeImageFile = (newFilename, oldFilename) => {
    const imagePath = `public/images/user/${newFilename}`;
    
    // Check if the file exists
    if (fs.existsSync(imagePath)) {
        try {
            // Attempt to remove the file
            fs.unlinkSync(imagePath);
            console.log("Old Profile Picture has been Deleted");
        } catch (error) {
            console.log("Error while removing image file", error);
            throw error;
        }
    } else {
        //if file does not exist then delete the uploaded image from the folder
        // console.log("new added file name:", oldFilename);
        fs.unlinkSync(`public/images/user/${oldFilename}`)
        console.log("File does not exist.");
        throw  new Error('No such File present');
    }
}

module.exports = {removeImageFile,organizeProductDetails,organizeProductDetailsMap,generalProductDetailsQuery};