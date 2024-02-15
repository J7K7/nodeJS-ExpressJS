// const moment = require('moment-timezone');
const executeQuery = require("../../db/connection");
const Slot = require("../product_model/slot");
const moment = require("moment");

// Get the current time in Indian Standard Time (IST)
// const nowIST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

class BookingsMaster {
  constructor(
    bookingDate,
    booking_fromDatetime,
    booking_toDatetime,
    status,
    grandTotal
  ) {
    this.bookingDate = bookingDate;
    this.booking_fromDatetime = booking_fromDatetime;
    this.booking_toDatetime = booking_toDatetime;
    this.status = status;
    this.grandTotal = grandTotal;
  }

  async save() {
    let sql = `
            INSERT INTO bookingsmaster (
                bookingDate,
                booking_fromDatetime,
                booking_toDatetime,
                status,
                grandTotal
            ) VALUES (
                '${this.bookingDate}',
                '${this.booking_fromDatetime}',
                '${this.booking_toDatetime}',
                '${this.status}',
                '${this.grandTotal}'
            )
        `;

    // console.log("Connection is : " , connection)

    try {
      const res = await executeQuery(sql);
      // const res = await connection.execute(sql);
      return res;
    } catch (err) {
      throw ("Error saving booking entry:", err);
    }
  }

  static async checkBookingId(bookingId) {
    let sql = `
            SELECT COUNT(*) as count FROM bookingsmaster WHERE bookingId = ${bookingId};
        `;

    return await executeQuery(sql);
  }

  // From Here all updates written by JIM Patel

  //Find the All Bookings with  given SlotId and status is Confirmed(StatusId:3)
  static async findAllConfirmBookingsBySlotId(slotId) {
    try {
      // Fetch bookings associated with the provided slot ID
      const query = `
                SELECT bookingId
                FROM bookproduct 
                WHERE slotId = ? AND statusId = 3
            `;
      // Check That the SlotId is valid Or not.If it's not then Throw an Error
      const slot = await Slot.getSlotById(slotId);

      const bookings = await executeQuery(query, [slotId]);
      // console.log(bookings);
      return bookings.map((row) => row.bookingId);
    } catch (error) {
      // Handle errors
      console.error("Error fetching bookings by slot ID:", error);
      throw new Error("Error fetching bookings by slot ID: " + error.message);
    }
  }

  // This function finds all future confirmed bookings by slotId
  // It returns an array of bookingIds for future confirmed bookings that have a status of 3 (confirmed)
  // and a booking_fromDatetime greater than the current date and time
  static async findAllFutureConfirmBookingsBySlotId(slotId) {
    // Get the current date and time in the specified format
    const currentDate = moment().startOf("day").format("YYYY-MM-DD HH:mm:ss");

    // Construct the SQL query to find future confirmed bookings by slot ID
    const query = `
        SELECT DISTINCT bm.bookingId
        FROM bookingsmaster bm
        JOIN bookproduct bp ON bm.bookingId = bp.bookingId
        WHERE bp.slotId = ?   
        AND bm.status = 3     
        AND bm.booking_fromDatetime > ? 
    `;
     // Check That the SlotId is valid Or not.If it's not then Throw an Error
     const slot = await Slot.getSlotById(slotId);

    // Execute the SQL query with the slot ID and current date as parameters
    const result = await executeQuery(query, [slotId, currentDate]);

    // Extract bookingIds from the query result
    const bookingIds = result.map((row) => row.bookingId);

    // Return the array of bookingIds
    return bookingIds;
  }

  //Cancels bookings by admin for the specified booking IDs
  static async cancelBookingsByAdmin(bookingIds, status, message) {
    try {
        // In this we are changing the status of the bookingmaster and deacresing the quantity  of slots in  slotmaster table
    
        for (const bookingId of bookingIds) {
            const query = `
              UPDATE bookingsmaster AS bm
              JOIN bookproduct AS bp ON bm.bookingId = bp.bookingId
              JOIN slotmaster AS sm ON bp.slotId = sm.slotId
              SET bm.status = ?,
                  bm.cancel_message = ?,
                  sm.slotBooked = sm.slotBooked - bp.quantity 
              WHERE bm.bookingId = ?
            `;
            
            // Prepare the values to be bound to the query
            const values = [status, message, bookingId];
            
            // Execute the query for each booking ID
            await executeQuery(query, values);
          }
    
      // Return the true
      return true;
    } catch (error) {
      // If an error occurs during the database operation, throw an error with details
      throw new Error(`Error updating booking statuses: ${error.message}`);
    }
  }
}

module.exports = BookingsMaster;
