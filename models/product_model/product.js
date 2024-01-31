const executeQuery = require("../../db/connection");

// This is the Model for the productMaster Table .
class Product {
  constructor(
    productName,
    productDescription,
    advanceBookingDuration,
    active_fromDate,
    active_toDate,
    productCapacity
  ) {
    this.productName = productName;
    this.productDescription = productDescription;
    this.advanceBookingDuration = advanceBookingDuration;
    this.active_fromDate = active_fromDate;
    this.active_toDate = active_toDate;
    this.productCapacity = productCapacity;
  }

  // Function to Save the product into the productMaster table.
  async save() {
    try {
      // SQL query to insert a new product into the database
      const insertQuery = `
        INSERT INTO productmaster (
          productName,
          productDescription,
          advanceBookingDuration,
          active_fromDate,
          active_toDate,
          productCapacity,
          isActive
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      // Array of values to be inserted into the query
      const values = [
        this.productName,
        this.productDescription,
        this.advanceBookingDuration,
        this.active_fromDate,
        this.active_toDate,
        this.productCapacity,
        1, // isActive set to 1 by default
      ];

      // Execute the query and await the result
      const result = await executeQuery(insertQuery, values);
      
      // Check if the product was successfully inserted
      if (result.affectedRows === 1) {
        console.log('Product inserted successfully!');
        return result.insertId; // Return the ID of the newly inserted product
      } else {
        // If insertion fails, throw an error
        throw new Error('Failed to insert product.');
      }
    } catch (error) {
      // Handle any errors that occur during the insertion process
      console.error('Error in inserting product:', error.message);
      throw error; // Throw the error to propagate it up the call stack
    }
  }
}
module.exports = Product;
