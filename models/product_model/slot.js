const executeQuery = require("../../db/connection");
const Feature = require("./feature");
const ProductImage = require("./image");

// This is the Model for the productMaster Table .
class Slot {
  constructor(slotDate,slotFromDateTime,slotToDateTime,slotOriginalCapacity,slotPrice,slotActive){
    this.slotDate= slotDate;
    this.slotFromDateTime= slotFromDateTime;
    this.slotToDateTime=slotToDateTime;
    this.slotOriginalCapacity= slotOriginalCapacity;
    this.slotPrice=slotPrice;
    this.slotActive=slotActive;
  }

  async addSlot(){
    try {
        // Insert query to add a new slot
        const insertQuery = `INSERT INTO slotmaster (slotDate, slotFromDateTime,slotToDateTime,slotOriginalCapacity,slotPrice,slotActive) VALUES (?,?,?,?,?, ?)`;
        const values = [this.slotDate, this.slotFromDateTime,this.slotToDateTime,this.slotOriginalCapacity,this.slotPrice,this.slotActive];
        // Execute the query
        const result = await executeQuery(insertQuery, values);
         // returning  the response from the slotmaster
        return result.insertId;
      } catch (error) {
        // Handle errors
        console.error('Error in adding slot:', error);
        throw error; // throw the error to be caught by the calling function
      }

  }

  // Function For updating particular slot details using its id
  static async updateSlotById(slotId, newSlotDetails) {
    try {
      // Construct SQL query to update slot details
      const updateQuery = `
        UPDATE slotmaster
        SET slotFromDateTime = ?, slotToDateTime = ?, slotCapacity = ?, slotPrice = ?
        WHERE slotId = ?
      `;
  
      // Execute the update query with the new slot details
      const result = await executeQuery(updateQuery, [
        newSlotDetails.slotFromDateTime,
        newSlotDetails.slotToDateTime,
        newSlotDetails.slotCapacity,
        newSlotDetails.slotPrice,
        slotId
      ]);
  
      // Check if the update was successful
      if (result.affectedRows === 1) {
        return true; // Slot updated successfully
      } else {
        throw new Error('Failed to update slot details.');
      }
    } catch (error) {
      // Handle errors
      throw new Error(`Error updating slot: ${error.message}`);
    }
  }
  
}
module.exports = Slot;
