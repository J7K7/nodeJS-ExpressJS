const { executeQuery } = require('../../db/connection')

class ProductCategory {
    constructor(categoryName) {
        this.categoryName = categoryName;
    }

    // Method to insert a new category into the database
    async saveCategory() {
        try {
            const insertQuery = 'INSERT INTO productcategory (categoryName) VALUES (?)';
            console.log("hiii")
            const result = await executeQuery(insertQuery, [this.categoryName]);

            console.log(result)
            return result; // Return the ID of the inserted category
        } catch (error) {
            console.error('Error in saving category:', error);
            throw error; // Throw the error for handling in the calling function
        }
    }

    // Method to retrieve all categories from the database
    async getAllCategories() {
        try {
            const selectQuery = 'SELECT productCategoryId, categoryName FROM productcategory';
            const categories = await executeQuery(selectQuery);
            return categories; // Return the retrieved categories
        } catch (error) {
            console.error('Error in retrieving categories:', error);
            throw error; // Throw the error for handling in the calling function
        }
    }

    // Method to find a category by ID
    static async findCategoryById(productCategoryId) {
        try {
            const selectQuery = 'SELECT * FROM productcategory WHERE productCategoryId = ?';
            const category = await executeQuery(selectQuery, [productCategoryId]);
            if (category.length == 0) {
                return null;
            }
            return category[0]; // Return the found category
        } catch (error) {
            console.error('Error in finding category by ID:', error);
            throw error; // Throw the error for handling in the calling function
        }
    }

    // Link product with category 
    static async linkProductWithCategory(productId, productCategoryId) {
        try {
            const insertQuery = 'INSERT INTO productcategory_product_relation (productId, productCategoryId) VALUES (?, ?)';
            const result = await executeQuery(insertQuery, [productId, productCategoryId]);
            return result; // Return the result of the insertion
        } catch (error) {
            console.error('Error in linking product with category:', error);
            throw error; // Throw the error for handling in the calling function
        }
    };


    // Method to retrieve products by category
    static async getProductsByCategory(productCategoryId) {
        try {
            const selectQuery = `
                SELECT p.*
                FROM productmaster p
                INNER JOIN productcategory_product_relation r ON p.productId = r.productId
                WHERE r.productCategoryId = ?
            `;
            const products = await executeQuery(selectQuery, [productCategoryId]);
            return products; // Return the retrieved products
        } catch (error) {
            console.error('Error in retrieving products by category:', error);
            throw error; // Throw the error for handling in the calling function
        }
    }

    // Method to update a category in the database
    async updateCategory(categoryId) {
        try {
            const updateQuery = 'UPDATE productcategory SET categoryName = ? WHERE productCategoryId = ?';
            const result = await executeQuery(updateQuery, [this.categoryName, categoryId]);
            return result; // Return the result of the update operation
        } catch (error) {
            console.error('Error in updating category:', error);
            throw error; // Throw the error for handling in the calling function
        }
    }

        // Method to delete a category if no products are associated with it
        static async deleteCategory(productCategoryId) {
            try {
                // Check if there are any associated products
                const productCountQuery = 'SELECT COUNT(*) as productCount FROM productcategory_product_relation WHERE productCategoryId = ?';
                const productCountResult = await executeQuery(productCountQuery, [productCategoryId]);
                const productCount = productCountResult[0].productCount;
    
                if (productCount > 0) {
                    // Return an error if there are associated products
                    return { success: false, message: 'Cannot delete category. Products are associated with this category.' };
                }
    
                // If no associated products, delete the category
                const deleteQuery = 'DELETE FROM productcategory WHERE productCategoryId = ?';
                await executeQuery(deleteQuery, [productCategoryId]);
    
                return { success: true, message: 'Category deleted successfully.' };
            } catch (error) {
                console.error('Error in deleting category:', error);
                throw error; // Throw the error for handling in the calling function
            }
        }

}

module.exports = ProductCategory;
