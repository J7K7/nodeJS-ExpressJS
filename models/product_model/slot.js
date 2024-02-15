const { combineDateTime } = require("../../common/dateFormat");
const executeQuery = require("../../db/connection");
const BookProduct = require("../booking_model/bookProduct");
const Feature = require("./feature");
const ProductImage = require("./image");
const moment = require("moment");

// This is the Model for the productMaster Table .
class Slot {
  constructor(
    slotDate,
    slotFromDateTime,
    slotToDateTime,
    slotOriginalCapacity,
    slotPrice,
    slotActive
  ) {
    this.slotDate = slotDate;
    this.slotFromDateTime = slotFromDateTime;
    this.slotToDateTime = slotToDateTime;
    this.slotOriginalCapacity = slotOriginalCapacity;
    this.slotPrice = slotPrice;
    this.slotActive = slotActive;
  }

  async addSlot() {
    try {
      // Insert query to add a new slot
      const insertQuery = `INSERT INTO slotmaster (slotDate, slotFromDateTime,slotToDateTime,slotOriginalCapacity,slotPrice,slotActive) VALUES (?,?,?,?,?, ?)`;
      const values = [
        this.slotDate,
        this.slotFromDateTime,
        this.slotToDateTime,
        this.slotOriginalCapacity,
        this.slotPrice,
        this.slotActive,
      ];
      // Execute the query
      const result = await executeQuery(insertQuery, values);
      // returning  the response from the slotmaster
      return result.insertId;
    } catch (error) {
      // Handle errors
      console.error("Error in adding slot:", error);
      throw error; // throw the error to be caught by the calling function
    }
  }
  //getSlot by ID
  static async getSlotById(slotId) {
    try {
      const query =
        "SELECT slotDate, slotFromDateTime, slotToDateTime, slotOriginalCapacity, slotPrice, slotActive, slotBooked FROM slotmaster WHERE slotId = ?";
      const result = await executeQuery(query, [slotId]);
      if (result.length > 0) {
        return result[0];
      } else {
        throw new Error("Slot not found");
      }
    } catch (error) {
      throw new Error(`Error fetching slot by ID: ${error.message}`);
    }
  }
  // Find the productId associated with a given slotId.
  static async findProductIdBySlotId(slotId) {
    try {
      // Construct SQL query to find productId by slotId
      const query = `
        SELECT productId
        FROM slotproduct_relation
        WHERE slotId = ?
      `;

      // Execute the query with the provided slotId
      const result = await executeQuery(query, [slotId]);

      // Check if a row was found
      if (result.length > 0) {
        // Return the productId associated with the slot
        return result[0].productId;
      } else {
        throw new Error("Slot not found.");
      }
    } catch (error) {
      // Handle errors
      throw new Error(`Error finding productId for slot: ${error.message}`);
    }
  }

  // updateSlotStatusById
  static async updateSlotStatusById(slotId, status) {
    try {
      // Construct SQL query to update slot status by ID
      const updateQuery = `
        UPDATE slotmaster
        SET slotActive = ?
        WHERE slotId = ?
      `;

      // Execute the update query to update the slot status
      const result = await executeQuery(updateQuery, [status, slotId]);

      // Check if the update was successful
      if (result.affectedRows === 1) {
        return true; // Slot status updated successfully
      } else {
        throw new Error("Failed to update slot status.");
      }
    } catch (error) {
      // Handle errors
      throw new Error(`Error updating slot status: ${error.message}`);
    }
  }

  // Function For updating particular slot details using its id
  static async updateSlotById(slotId, newSlotDetails, bookingCategoryId) {
    const { fromTime, toTime, capacity, price } = newSlotDetails;
    try {
      let result = await this.getSlotById(slotId);
      const slotBooked = result.slotBooked;
      // Check if the updated slot capacity is less than the number of booked slots.
      // If so, it indicates that there are booked slots exceeding the updated capacity,
      // which is not allowed as it would result in overbooking.
      console.log();
      if (capacity < slotBooked) {
        throw new Error(
          "The number of available slots cannot be less than the number of booked slots"
        );
      }
      // Construct SQL query to update slot details
      const updateQuery = `
        UPDATE slotmaster
        SET slotFromDateTime = ?, slotToDateTime = ?, slotOriginalCapacity = ?, slotPrice = ?
        WHERE slotId = ?
      `;
      let slotFromDateTime, slotToDateTime;
      if (bookingCategoryId == 1) {
        slotFromDateTime = combineDateTime(result.slotDate, fromTime);
        slotToDateTime = combineDateTime(result.slotDate, toTime);
      } else if (bookingCategoryId == 2) {
        slotFromDateTime = combineDateTime(result.slotDate, fromTime);
        const nextDayDate = moment(result.slotDate).add(1, "day");
        slotToDateTime = combineDateTime(nextDayDate, toTime);
      }
      console.log();
      // Execute the update query with the new slot details
      result = await executeQuery(updateQuery, [
        slotFromDateTime,
        slotToDateTime,
        capacity,
        price,
        slotId,
      ]);

      // Check if the update was successful
      if (result.affectedRows === 1) {
        return true; // Slot updated successfully
      } else {
        throw new Error("Failed to update slot details.");
      }
    } catch (error) {
      // Handle errors
      throw new Error(`Error updating slot: ${error.message}`);
    }
  }
  /**
   * Deletes the slot from the slotmaster table and sets the slotId to NULL in the bookProduct table
   * Also removing the relation beetween  slot and product.
   * in the bookProduct table for all products associated with the deleted slot.
   * This ensures that bookings remain intact but are no longer associated with the deleted slot.
   * If a booking is in 'added to cart', 'confirmed', or any other status, its slotId is still set to NULL.
   * @param {number} slotId - The ID of the slot to be deleted.
   */
  static async deleteSlotById(slotId) {
    try {
      // Get the original slot details using the provided slot ID
      let productId = await this.findProductIdBySlotId(slotId);
      console.log(productId);

      // SQL query to delete the slot from the slotproduct_relation table
      const deleteRelationQuery = `DELETE FROM slotproduct_relation WHERE slotId = ?`;

      // Execute the query with the slotId as a parameter
      await executeQuery(deleteRelationQuery, [slotId]);

      // Update slotId to NULL in bookProduct
      await BookProduct.updateSlotIdToNull(slotId);

      // Now we can safely Delete the slotId from the slotmaster.

      // SQL query to delete the slot from the slotmaster
      const deleteQuery = `DELETE FROM slotmaster WHERE slotId = ?`;

      // Execute the query with the slotid as a parameter
      const result = await executeQuery(deleteQuery, [slotId]);

      // Check if deletion was successful
      if (result && result.affectedRows > 0) {
        return true; // Slot deleted successfully
      } else {
        throw new Error(
          "Error deleting slot: Slot not found or already deleted."
        );
      }
    } catch (error) {
      // Handle errors
      throw new Error(`Error deleting slot: ${error.message}`);
    }
  }
}
module.exports = Slot;
