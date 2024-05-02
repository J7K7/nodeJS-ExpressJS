const { combineDateTime } = require("../../common/dateFormat");
const {executeQuery} = require("../../db/connection");
const BookProduct = require("../booking_model/bookProduct");
const Feature = require("./feature");
const ProductImage = require("./image");
const moment = require("moment");
const Product = require("./product");


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
  // This function for the  Single Day slot's with particular Date adding into slotmaster table
   // slotData is in string form json data we need to parse the that data into JSON
  // currentDate is moment format  date or date string in "YYYY-MM-DD" format
  static async addSingleDateSlot(slotData, currentDate, bookingCategoryId) {
    const slotIds = [];
     // Parse slotData into JSON format
    const parsedSlotData = JSON.parse(slotData);
    currentDate=moment(currentDate);
    try {
        if (bookingCategoryId == 1) {
            for (const slotInfo of parsedSlotData) {
              const { slotFromDateTime, slotToDateTime, slotOriginalCapacity, slotPrice } = slotInfo;
                const slotActive = 1;
                const slot = new Slot(
                    currentDate.format("YYYY-MM-DD"),
                    combineDateTime(currentDate, slotFromDateTime),
                    combineDateTime(currentDate, slotToDateTime),
                    slotOriginalCapacity,
                    slotPrice,
                    slotActive
                );

                try {
                    const slotId = await slot.addSlot();
                    slotIds.push(slotId);
                } catch (error) {
                    throw new Error(`Error in adding slot: ${error.message}`);
                }
            }
        } else if (bookingCategoryId == 2) {
          const { slotFromDateTime, slotToDateTime, slotOriginalCapacity, slotPrice } = parsedSlotData[0];
            const slotActive = 1;
            const checkInTime = combineDateTime(currentDate, slotFromDateTime);
            const nextDayDate = moment(currentDate).add(1, "day");
            const checkOutTime = combineDateTime(nextDayDate, slotToDateTime);
            const singleDaySlot = new Slot(
                currentDate.format("YYYY-MM-DD"),
                checkInTime,
                checkOutTime,
                slotOriginalCapacity,
                slotPrice,
                slotActive
            );

            try {
                const slotId = await singleDaySlot.addSlot();
                slotIds.push(slotId);
            } catch (error) {
                throw new Error(`Error in adding slot: ${error.message}`);
            }
        }
        return slotIds;
    } catch (error) {
        throw error;
    }

   
}

  //This function is for Adding single slot into particular product mostly applicable for bookingCategory 1 (slotBAsed)
  static async addSingleSlotByProductId(productId,slotData){
    try {
     //Combine Date and Time for convertin into "YYYY-MM-DD HH:MM:SS"
     const slotFromDateTime = combineDateTime(slotData.slotDate, slotData.slotFromDateTime);
     const slotToDateTime = combineDateTime(slotData.slotDate,slotData.slotToDateTime);
  
     const newSlot= new Slot(slotData.slotDate,slotFromDateTime,slotToDateTime,slotData.slotOriginalCapacity,slotData.slotPrice,1);//Setting slotDetails
      const slotId = await newSlot.addSlot();
      if(!slotId){
        throw new Error ( "Failed to create Slot");
      }
      // Query for the linking this slotId with the Product Id inside the slotproduct_relation
      const insertQuery=`INSERT INTO slotproduct_relation (productId, slotId)
      VALUES (${productId}, ${slotId})`;
      //execute the query
      const result = await executeQuery(insertQuery);
      newSlot.slotId=slotId;
      return newSlot;
  } catch (error) {
      
        // Handle any errors that occur during the process
      // if error in adding slot than it is directly thrown from here
      if (error.message.includes("Error in adding slot")) {
        throw error;
      }
      // otherwise error will be In linking product with slots
      
      else 
      {console.error("Error linking product with slot:", error);
        throw new Error(`Error In linking product with slot: ${error.message}`);}
  }
  }
  //getSlot by ID
  // Made cahnges in thsi function ---- addedc connection param 
  static async getSlotById(slotId , connection) {
    try {
      const query =
        "SELECT slotDate, slotFromDateTime, slotToDateTime, slotOriginalCapacity, slotPrice, slotActive, slotBooked FROM slotmaster WHERE slotId = ?";

      let result;

      if(connection != null){
        result = await connection.execute(query , [slotId]) 
        result = result[0]
      }else{
        result = await executeQuery(query, [slotId]);
      }

      // console.log("result" , result)

      if (result.length > 0) {
        return result[0];
      } else {
        throw new Error("Slot not found");
      }
    } catch (error) {
      throw new Error(`Error fetching slot by ID: ${error.message}`);
    }
  }
  // This function give the active slots for  a particular product id and slotdate
  static async getSlotsByDateAndProductId(date, productId) {
    try {
      const query = `SELECT sm.slotId, slotDate, slotFromDateTime, slotToDateTime, slotOriginalCapacity, slotPrice, slotActive, slotBooked FROM slotmaster as sm INNER JOIN slotproduct_relation spr ON sm.slotId = spr.slotId WHERE sm.slotDate=? AND spr.productId=? AND sm.slotActive=1 `;
      const results = await executeQuery(query, [date, productId]);
      console.log(results)
      return results;
    } catch (error) {
      throw new Error(`Error fetching slots by Date and ProductId: ${error.message}`);
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
      if (result.affectedRows == 1) {
        return true; // Slot status updated successfully
      } else {
        throw new Error("No slot Found with This slotId");
      }
    } catch (error) {
      // Handle errors
      throw error
    }
  }

  // Function For updating particular slot details using its id
  static async updateSlotById(slotId, newSlotDetails, bookingCategoryId) {
    const { slotFromDateTime, slotToDateTime, slotOriginalCapacity, slotPrice } = newSlotDetails;
    try {
      let result = await this.getSlotById(slotId , null);
      const slotBooked = result.slotBooked;
      // Check if the updated slot capacity is less than the number of booked slots.
      // If so, it indicates that there are booked slots exceeding the updated capacity,
      // which is not allowed as it would result in overbooking.
      // console.log(slotBooked);
      if (slotOriginalCapacity < slotBooked) {
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
        slotFromDateTime = combineDateTime(result.slotDate, slotFromDateTime);
        slotToDateTime = combineDateTime(result.slotDate, slotToDateTime);
      } else if (bookingCategoryId == 2) {
        slotFromDateTime = combineDateTime(result.slotDate, slotFromDateTime);
        const nextDayDate = moment(result.slotDate).add(1, "day");
        slotToDateTime = combineDateTime(nextDayDate, slotToDateTime);
      }

      // Execute the update query with the new slot details
      result = await executeQuery(updateQuery, [
        slotFromDateTime,
        slotToDateTime,
        slotOriginalCapacity,
        slotPrice,
        slotId,
      ]);

      // Check if the update was successful
      if (result.affectedRows === 1) {
        return true; // Slot updated successfully
      } else {
        throw new Error("Slot Not Found.");
      }
    } catch (error) {
      // Handle errors
      throw error
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
      //validate that slotId is valid or not 
      let slotDetails = await this.getSlotById(slotId , null);

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

  async updateSlotAndBooking(connection, bookingId){
      const [updateResult] = await connection.execute(`
          UPDATE slotmaster AS sm
          JOIN bookproduct AS bp ON sm.slotId = bp.slotId
          SET 
              sm.slotBooked = sm.slotBooked + bp.quantity,
      
              sm.slotActive = CASE 
                              WHEN sm.slotOriginalCapacity = (sm.slotBooked + bp.quantity) THEN 0
                              ELSE sm.slotActive
                          END
          WHERE bp.bookingId = ? and sm.slotOriginalCapacity >= (sm.slotBooked + bp.quantity);
      `, [bookingId]);

      // console.log("Insiude Fn",updateResult);
      return updateResult;
  };

  async findSlotIds(connection, productId, bookingFromDate, bookingToDate) {
    try {
        // Applicable for Day based booking 
        // If Business Category = Day -- Find the slots based on  booking_fromDatetime, booking_toDatetime

        let q = `
        SELECT slotId 
        FROM slotmaster 
        WHERE slotDate >= '${bookingFromDate}' 
            AND slotDate <= '${bookingToDate}'
            AND slotId IN (
                SELECT slotId 
                FROM slotproduct_relation 
                WHERE productId = '${productId}'
            )
            AND '${productId}' NOT IN (
                SELECT productId
                FROM productmaster
                WHERE isDeleted = 1 or isActive=0
            );

        `

        const slotIds = await connection.execute(q, [bookingFromDate, bookingToDate, productId]);

        return slotIds[0];
    } catch (err) {
        throw new Error("Error fetching the slots for this product: " + err.message);
    }
}

  
}
module.exports = Slot;
