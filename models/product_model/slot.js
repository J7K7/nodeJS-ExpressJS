const executeQuery = require("../../db/connection");
const Feature = require("./feature");
const ProductImage = require("./image");

// This is the Model for the productMaster Table .
class Slot {
  constructor(slotDate,slotFromDateTime,slotToDateTime,slotCapacity,slotPrice,slotActive){
    this.slotDate= slotDate;
    this.slotFromDateTime= slotFromDateTime;
    this.slotToDateTime=slotToDateTime;
    this.slotCapacity= slotCapacity;
    this.slotPrice=slotPrice;
    this.slotActive=slotActive;
  }

  async addSlot(){
    try {
        // Insert query to add a new slot
        const insertQuery = `INSERT INTO slotmaster (slotDate, slotFromDateTime,slotToDateTime,slotCapacity,slotPrice,slotActive) VALUES (?,?,?,?,?, ?)`;
        const values = [this.slotDate, this.slotFromDateTime,this.slotToDateTime,this.slotCapacity,this.slotPrice,this.slotActive];
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
}
module.exports = Slot;
