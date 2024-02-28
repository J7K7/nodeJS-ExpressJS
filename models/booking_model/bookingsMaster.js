// const moment = require('moment-timezone');
const { executeQuery } = require("../../db/connection");
const Slot = require("../product_model/slot");
const moment = require("moment");
const { validateDateTime } = require("../../common/dateFormat");
const BookingStatuses = require('../../models/booking_model/bookingStatuses')
const UserBookingRelation = require('../../models/booking_model/userbooking_relation')

class BookingsMaster {
  constructor(
    bookingDate,
    booking_fromDatetime,
    booking_toDatetime,
    statusId,
    grandTotal
  ) {
    this.bookingDate = bookingDate;
    this.booking_fromDatetime = booking_fromDatetime;
    this.booking_toDatetime = booking_toDatetime;
    this.statusId = statusId;
    this.grandTotal = grandTotal;
  }

  async save(connection) {
    let sql = `
        INSERT INTO bookingsmaster (
            bookingDate,
            booking_fromDatetime,
            booking_toDatetime,
            statusId,
            grandTotal
        ) VALUES (
            '${this.bookingDate}',
            '${this.booking_fromDatetime}',
            '${this.booking_toDatetime}',
            '${this.statusId}',
            '${this.grandTotal}'
        )
    `;

    // console.log("Connection is : " , connection)

    try {
      // const res = await executeQuery(sql);
      const res = await connection.execute(sql);
      return res;
    } catch (err) {
      console.log(err);
      throw new Error("Error saving booking entry:", err);
    }
  }

  async checkIfCartExists(userId, connection) {
    try {
      // For the first time when teh user clicks on the product :
      // 2 Possibilities : Either teh cart eixsts or the cart does not exists
      // If teh cart exist -- booking id exists with status addedTocart-- add product to the same booking Id
      // Or if teh cart does not exist -- booking id does not exist - hence create one -- and then add product

      // To check if the cart exist
      // get the current userId from headers
      // go to userbooking_relation table
      // For all the coressponding bookingId of the particular user --
      // chcek if any bookingId's status is addToCart
      // if yes --- get the bookingId & add product to same bookingId
      // Else create a default booking entry to get the bookingId & the cart

      const bookingIdWithStatusAddedToCartQuery = `
            SELECT bm.bookingId 
            FROM userbooking_relation AS ubr
            JOIN bookingsmaster AS bm ON ubr.bookingId = bm.bookingId
            WHERE ubr.userId = ? 
            AND bm.statusId = 1;
        `;


      if (connection == null) {
        const bookingIdWithStatusAddedToCart = await executeQuery(
          bookingIdWithStatusAddedToCartQuery,
          [userId]
        );
        console.log("bookingIdWithStatusAddedToCart", bookingIdWithStatusAddedToCart);

        return bookingIdWithStatusAddedToCart.length === 1
          ? bookingIdWithStatusAddedToCart[0].bookingId
          : null;
      } else {
        const bookingIdWithStatusAddedToCart = await connection.execute(
          bookingIdWithStatusAddedToCartQuery,
          [userId]
        );


        return bookingIdWithStatusAddedToCart[0].length === 1
          ? bookingIdWithStatusAddedToCart[0][0].bookingId
          : null;
      }
    } catch (err) {
      throw new Error("Error getting the cart details" + err.message);
    }
  }

  static async checkBookingId(bookingId) {
    let sql = `
        SELECT COUNT(*) as count FROM bookingsmaster WHERE bookingId = ${bookingId};
    `;

    try{
      return await executeQuery(sql);


    }catch(err){
      throw new Error('Invalid BookingId')
    }
  }

  static async updateStatusAndCancelMessage(
    connection,
    bookingId,
    statusId,
    cancel_message = null
  ) {
    let sql = `
        UPDATE bookingsmaster
        SET statusId = ?,
        cancel_message = ?,
        bookingDate = DATE_FORMAT(NOW(), '%Y-%m-%d')
        WHERE bookingId = ?;
    `;

    try {
      let res;

      // the if condition is req bcoz the same query is used in confirm booking(transaction is invovled) & also in cancel booking(No transaction)
      if (connection == null) {
        res = await executeQuery(sql, [statusId, cancel_message, bookingId]);
      } else {
        res = await connection.execute(sql, [
          statusId,
          cancel_message,
          bookingId,
        ]);
      }

      return res;
    } catch (err) {
      throw new Error("Error saving booking entry: " + err);
    }
  }

  async getCartItems(bookingId) {
    const getCartItemsQuery = `            
    SELECT b.bookingId,
    p.productId, pm.productName , p.quantity, p.slotId, p.slotFromDateTime, p.slotToDateTime, p.price, b.grandTotal
    FROM bookingsmaster b
    JOIN bookProduct p ON b.bookingId = p.bookingId
    JOIN productmaster pm ON p.productId = pm.productId
    WHERE p.bookingId = ?;`;

    const cartItems = await executeQuery(getCartItemsQuery, [bookingId]);
    return cartItems;
  }

  async deleteCartEntryIfEmpty(currentBookingId, connection) {
    const checkCartItemsQuery = `
        SELECT 1 FROM bookproduct WHERE bookingId = ?;
    `;
    const [checkCartItems] = await connection.execute(checkCartItemsQuery, [
      currentBookingId,
    ]);

    if (checkCartItems.length === 0) {
      const deleteQueries = [
        `DELETE FROM userbooking_relation WHERE bookingId = ?;`,
        `DELETE FROM bookingsmaster WHERE bookingId = ?;`,
      ];
      for (const query of deleteQueries) {
        await connection.execute(query, [currentBookingId]);
      }
    }
  }

  async updateGrandTotalAndDates(
    connection,
    currentBookingId,
    booking_fromDatetime,
    booking_toDatetime
  ) {
    // Update grand total of the cart
    const sql = ` 
    UPDATE bookingsmaster AS bm
    SET bm.grandTotal =(SELECT SUM(price*quantity)
        FROM bookproduct
        where bookingId=?),
        booking_fromDatetime = ?, 
        booking_toDatetime = ?,
        timestamp = NOW()
        where bookingId=? ;`;

    await connection.execute(sql, [
      currentBookingId,
      booking_fromDatetime,
      booking_toDatetime,
      currentBookingId,
    ]);
  }

  async createADefaultBookingMasterEntry(
    connection,
    userId,
    bookingFromDate,
    bookingToDate,
    slotIds,
    bookingCategoryId
  ) {
    try {
      // When a product is first clicked for booking (Add to cart)
      // the bookingsmaster table will store the information
      // Will create the bookingId with default status addedToCart & grandTotal 0.0

      // This is then used by the book Product table further

      // Default status : AddedToCart
      // Find status Id  : For AddedToCart from bookingStatuses

      const addedToCartStatusId = await BookingStatuses.findAddedToCartStatusId(
        connection
      );

      // console.log(addedToCartStatusId[0][0].statusId);

      const statusId = addedToCartStatusId[0][0].statusId;

      // Date Format: YYYY-MM-DD
      // The day the product is booked : Date.now()
      const bookingDate = moment().format("YYYY-MM-DD");

      const grandTotal = 0.0;

      let booking_fromDatetime;
      let booking_toDatetime;
      // console.log("slotIds" , slotIds)
      if (bookingCategoryId == 1) {
        // fetch the slotFromDatetime & slotToDatetime from the slotId that is selected by the user
        let slotDetails = await connection.execute(
          `SELECT slotFromDateTime, slotToDateTime FROM slotmaster WHERE slotId = ?`,
          [slotIds[0]]
        );

        // console.log("slotDetails" ,slotDetails)
        booking_fromDatetime = moment(
          slotDetails[0][0].slotFromDateTime
        ).format("YYYY-MM-DD HH:mm:ss");
        booking_toDatetime = moment(slotDetails[0][0].slotToDateTime).format(
          "YYYY-MM-DD HH:mm:ss"
        );
      } else if (bookingCategoryId == 2) {
        // Initialize variables to hold the earliest and farthest dates
        let earliestSlotFromDateTime = null;
        let farthestSlotToDateTime = null;

        for (const slotId of slotIds) {
          const sql = `SELECT slotFromDateTime, slotToDateTime, slotBooked, slotPrice, slotActive, slotOriginalCapacity FROM slotmaster WHERE slotId = ?`;

          const [getSlotDetails] = await connection.execute(sql, [slotId]);

          const { slotFromDateTime, slotToDateTime } = await getSlotDetails[0];

          // Update earliestSlotFromDateTime if it's null or the current slotFromDateTime is earlier
          if (
            !earliestSlotFromDateTime ||
            moment(slotFromDateTime).isBefore(earliestSlotFromDateTime)
          ) {
            earliestSlotFromDateTime = moment(slotFromDateTime);
          }

          // Update farthestSlotToDateTime if it's null or the current slotToDateTime is later
          if (
            !farthestSlotToDateTime ||
            moment(slotToDateTime).isAfter(farthestSlotToDateTime)
          ) {
            farthestSlotToDateTime = moment(slotToDateTime);
          }
        }

        // Format the earliest and farthest dates
        booking_fromDatetime = earliestSlotFromDateTime;
        booking_toDatetime = farthestSlotToDateTime;
      }

      booking_fromDatetime = moment(booking_fromDatetime).format(
        "YYYY-MM-DD HH:mm:ss"
      );
      booking_toDatetime = moment(booking_toDatetime).format(
        "YYYY-MM-DD HH:mm:ss"
      );

      // Validate booking_fromDatetime and booking_toDatetime
      if (
        !booking_fromDatetime ||
        !validateDateTime(booking_fromDatetime) ||
        !booking_toDatetime ||
        !validateDateTime(booking_toDatetime) ||
        !(new Date(booking_fromDatetime) < new Date(booking_toDatetime))
      ) {
        throw new Error("Invalid From Date or To Date");
      }

      // Create an instance of BookingsMaster
      const bookingEntry = new BookingsMaster(
        bookingDate,
        booking_fromDatetime,
        booking_toDatetime,
        statusId,
        grandTotal
      );

      // console.log("Booking Entry : ", bookingEntry)

      const result1 = await bookingEntry.save(connection);

      const bookingId = result1[0].insertId;

      const userBookingRelation = new UserBookingRelation(userId, bookingId);
      userBookingRelation.save(connection);

      return {
        bookingId,
        bookingDate,
        booking_fromDatetime,
        booking_toDatetime,
      };
    } catch (err) {
      console.log(err);
      throw new Error(
        "Error generating the bookingId. Try Again!" + err.message
      );
    }
  }

  async validateBookingDates(
    bookingCategoryId,
    bookingFromDate,
    currentBookingId,
    currentbooking_fromDatetime,
    currentbooking_toDatetime,
    connection
  ) {

    // console.log(booking_fromDatetime,booking_toDatetime);
    if (bookingCategoryId == 1) {
      // VALIDATION : the booking_fromDatetime should be greater then the currentDate time then only the user can book the slot

      // Get the current date time
      const currentDate = moment().format("YYYY-MM-DD");
      // Extract the date part from booking_fromDatetime
      let currentbooking_fromDate = moment(currentbooking_fromDatetime).format(
        "YYYY-MM-DD"
      );


      // Check if the booking_fromDatetime is before the current date time
      if (moment(currentbooking_fromDate).isBefore(currentDate)) {
        // The booking date should be greater than the current datetime.
        throw new Error("Select an appropriate date the can be fullfilled.");
      }

      if (bookingFromDate !== currentbooking_fromDate) {
        throw new Error(
          "At a time , you can book products with the same Date."
        );
      }
    }

    if (bookingCategoryId == 2) {
      // VALIDATION : User is only allowed to book multiple products with the same booking_fromDatetime & booking_toDatetime
      const findExistingBookingDatesQuery = `
            SELECT booking_fromDatetime, booking_toDatetime FROM bookingsmaster WHERE bookingId = ?
        `;

      const [existingBookingDates] = await connection.execute(
        findExistingBookingDatesQuery,
        [currentBookingId]
      );

      if (
        moment(existingBookingDates[0].booking_fromDatetime).format(
          "YYYY-MM-DD"
        ) !== moment(currentbooking_fromDatetime).format("YYYY-MM-DD") ||
        moment(existingBookingDates[0].booking_toDatetime).format(
          "YYYY-MM-DD"
        ) !== moment(currentbooking_toDatetime).format("YYYY-MM-DD")
      ) {
        throw new Error(
          "You cannot add Products to cart that differ in Booking From Date & Booking To Date"
        );
      }
    }
  }

  async checkAndHandleCancelledStatus(connection, bookingId) {
    const [checkStatus] = await connection.execute(
      `
        SELECT statusId FROM bookingsmaster WHERE bookingId = ?
    `,
      [bookingId]
    );

    if (checkStatus[0].statusId === 5) {
      await BookingsMaster.updateStatusAndCancelMessage(
        connection,
        bookingId,
        6,
        "The quantity to be booked is not available"
      );
      return true;
    }

    return false;
  }

  async updateBookingDates(slotDetails, currentBookingId, currentbooking_fromDatetime, currentbooking_toDatetime, connection) {


    if (moment(slotDetails.slotFromDateTime).isBefore(currentbooking_fromDatetime)) {
      currentbooking_fromDatetime = slotDetails.slotFromDateTime
    }

    if (moment(slotDetails.slotToDateTime).isAfter(currentbooking_toDatetime)) {
      currentbooking_toDatetime = slotDetails.slotToDateTime;
    }

    let sql = `
        update bookingsmaster 
        set booking_fromDatetime = ?, booking_toDatetime = ? where bookingId = ?
    `

    await connection.execute(sql, [currentbooking_fromDatetime, currentbooking_toDatetime, currentBookingId])

    return { updatedbooking_fromDatetime: currentbooking_fromDatetime, updatedbooking_toDatetime: currentbooking_toDatetime }
  }


  async getBookingDates(bookingId, connection) {
    const sql = `
      select booking_fromDatetime , booking_toDatetime from bookingsmaster where bookingId = ?;
  `

    const [result] = await connection.execute(sql, [bookingId]);

    return { currentbooking_fromDatetime: result[0].booking_fromDatetime, currentbooking_toDatetime: result[0].booking_toDatetime };
  }



  // From Here all updates written by JIM Patel

  //find all the confirm booking with given productId (statusId:3)
  static async findAllConfirmBookingsByProductId(productId) {
    try {
      // Fetch bookings associated with the provided product ID
      const query = `
          SELECT DISTINCT bp.bookingId
          FROM bookingsmaster bm
          INNER JOIN bookproduct bp ON bm.bookingId = bp.bookingId
          WHERE bp.productId = ? AND bm.statusId = 3 
        `;

      // Execute the query to fetch confirmed bookings
      const bookings = await executeQuery(query, [productId]);

      // Extract booking IDs from the query result
      const bookingIds = bookings.map((row) => row.bookingId);

      return bookingIds;
    } catch (error) {
      // Handle errors
      console.error("Error fetching confirmed bookings by product ID:", error);
      throw new Error(
        "Error fetching confirmed bookings by product ID: " + error.message
      );
    }
  }

  //Find the All Bookings with  given SlotId and status is Confirmed(StatusId:3)
  static async findAllConfirmBookingsBySlotId(slotId) {
    try {
      // Fetch bookings associated with the provided slot ID
      const query = `
        SELECT DISTINCT bm.bookingId
        FROM bookingsmaster bm
        JOIN bookproduct bp ON bm.bookingId = bp.bookingId
        WHERE bp.slotId = ?   
        AND bm.statusId = 3      
              `;
      // Check That the SlotId is valid Or not.If it's not then Throw an Error
      const slot = await Slot.getSlotById(slotId, null);

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
  // It returns an array of bookingIds for future confirmed bookings that have a statusId of 3 (confirmed)
  // and a booking_fromDatetime greater than the current date and time than it means that this booking not started yet.
  static async findAllFutureConfirmBookingsBySlotId(slotId) {
    // Get the current date and time in the specified format
    const currentDate = moment().format("YYYY-MM-DD HH:mm:ss");
    // console.log(currentDate)

    // Construct the SQL query to find future confirmed bookings by slot ID
    const query = `
          SELECT DISTINCT bm.bookingId
          FROM bookingsmaster bm
          JOIN bookproduct bp ON bm.bookingId = bp.bookingId
          WHERE bp.slotId = ?   
          AND bm.statusId = 3     
          AND bm.booking_fromDatetime > ? 
      `;
    // Check That the SlotId is valid Or not.If it's not then Throw an Error
    const slot = await Slot.getSlotById(slotId, null);

    console.log("slot", slot)

    // Execute the SQL query with the slot ID and current date as parameters
    const result = await executeQuery(query, [slotId, currentDate]);

    // Extract bookingIds from the query result
    const bookingIds = result.map((row) => row.bookingId);

    // Return the array of bookingIds
    return bookingIds;
  }

  //Cancels bookings by admin for the specified booking IDs
  static async cancelBookingsByAdminOrUser(bookingIds, statusId, message) {
    try {
      // In this we are changing the statusId of the bookingmaster and deacresing the quantity  of slots in  slotmaster table

      for (const bookingId of bookingIds) {

       
        const query = `
                UPDATE bookingsmaster AS bm
                JOIN bookproduct AS bp ON bm.bookingId = bp.bookingId
                JOIN slotmaster AS sm ON bp.slotId = sm.slotId
                SET bm.statusId = ?,
                    bm.cancel_message = ?,
                    sm.slotBooked = sm.slotBooked - bp.quantity,
                    sm.slotActive=1
                WHERE bm.bookingId = ?
              `;

        // const query = `
        //         UPDATE bookingsmaster AS bm
        //         JOIN bookproduct AS bp ON bm.bookingId = bp.bookingId
        //         JOIN slotmaster AS sm ON bp.slotId = sm.slotId
        //         SET bm.statusId = ?,
        //             bm.cancel_message = ?,
        //             sm.slotBooked = sm.slotBooked - bp.quantity,
        //             sm.slotActive=CASE WHEN (sm.slotBooked - bp.quantity) <= sm.slotOriginalCapacity THEN true ELSE sm.slotActive END
        //         WHERE bm.bookingId = ?
        // `;

        // Prepare the values to be bound to the query
        const values = [statusId, message, bookingId];

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
