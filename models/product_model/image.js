const executeQuery = require("../../db/connection");
class ProductImage{
    constructor(imagePath) {
        this.imagePath = imagePath;
    }
    async addProductImage() {
        try {
            // const timestamp = Date.now();
            const insertQuery = 'INSERT INTO productImages (imagePath) VALUES (?)';
            const values = [this.imagePath];

            const result = await executeQuery(insertQuery, values);
            // returning  the response from the database
            // console.log(result);
            return result.insertId; // Return the ID of the newly inserted image
        } catch (error) {
            console.error('Error saving product image:', error);
            throw error;
        }
    }
}
module.exports=ProductImage;