const executeQuery = require("../../db/connection");
class ProductImage{
    constructor(imagePath) {
        this.imagePath = imagePath;
    }
    async addProductImage() {
        try {
            // const timestamp = Date.now();
            const insertQuery = 'INSERT INTO productImages (imagePath, timestamp) VALUES (?, ?)';
            const values = [this.imagePath, timestamp];

            const [rows, fields] = await executeQuery(insertQuery, values);

            return rows.insertId; // Return the ID of the newly inserted image
        } catch (error) {
            console.error('Error saving product image:', error);
            throw error;
        }
    }
}