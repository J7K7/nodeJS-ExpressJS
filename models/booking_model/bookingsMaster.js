// const moment = require('moment-timezone');
const executeQuery = require("../../db/connection");
const Slot = require('../product_model/slot');

// Get the current time in Indian Standard Time (IST)
// const nowIST = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

class BookingsMaster {
    constructor(bookingDate, booking_fromDatetime, booking_toDatetime, status, grandTotal) {
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
        
        try{
            const res = await executeQuery(sql);
            // const res = await connection.execute(sql);
            return res;
        }catch(err){
            throw('Error saving booking entry:', err);
        }
    }

    static async checkBookingId(bookingId){
        let sql = `
            SELECT COUNT(*) as count FROM bookingsmaster WHERE bookingId = ${bookingId};
        `;

        return await executeQuery(sql);
    }

    // From Here all updates written by JIM Patel

    //Find the All Bookings with  given SlotId and status is Confirmed(StatusId:3)
    static async  findAllBookingsBySlotId(slotId){
        try {
            // Fetch bookings associated with the provided slot ID
            const query = `
                SELECT bm.bookingId
                FROM bookingsmaster AS bm
                JOIN bookproduct AS bp ON bp.bookingId = bm.bookingId
                WHERE bp.slotId = ? AND bm.status = 3
            `;
            // Check That the SlotId is valid Or not.If it's not then Throw an Error
            const slot = await Slot.getSlotById(slotId);
          
            const bookings = await executeQuery(query, [slotId]);
            console.log(bookings);
            return bookings.map(row => row.bookingId);
      
          } catch (error) {
            // Handle errors
            console.error('Error fetching bookings by slot ID:', error);
            throw new Error('Error fetching bookings by slot ID: '+error.message);
          }
    }
    //Cancels bookings by admin for the specified booking IDs
    static async cancelBookingsByAdmin(bookingIds, status, message) {
        try {
          // Create placeholders for the booking IDs in the SQL query
          const placeholders = bookingIds.map(() => '?').join(',');
          console.log(placeholders);
          // Construct the SQL query to update booking statuses
          const query = `
            UPDATE bookingsmaster
            SET status = ?, cancel_message = ?
            WHERE bookingId IN (${placeholders})
          `;
          
          // Prepare the values to be bound to the query
          const values = [status, message, ...bookingIds];
          // Execute the SQL query with the provided values
          const result = await executeQuery(query, values);
          // Return the number of bookings updated
          return result.affectedRows;
        } catch (error) {
          // If an error occurs during the database operation, throw an error with details
          throw new Error(`Error updating booking statuses: ${error.message}`);
        }
      }


    
}

module.exports = BookingsMaster;