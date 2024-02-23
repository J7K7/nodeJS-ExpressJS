const { createPool, executeQuery } = require('../../db/connection');
const BookingsMaster = require('../../models/booking_model/bookingsMaster');
const BookingStatuses = require('../../models/booking_model/bookingStatuses');
const BookProduct = require('../../models/booking_model/bookProduct');


// PROCESS
// With all teh products in teh cart -- if user clicks on BOOK NOW -- this is when the confirm booking will execute 

// Updation required : 
// Change status to COMFIRMED if transaction is successfull
// Update the slotBooked by the quantity booked -- if slotBooked Exceeds teh slotOriginalCapacity -- rollback teh changes made & change the status to CANCELLED in bookingsmaster
// If slotBooked == slotOriginalCapacity - then deactive teh slot at that moment only 

const MAX_RETRIES = 3; // Maximum number of retries

exports.confirmBooking = async (req, res) => {
    const { userId } = req.body;

    // Start a transaction
    const connection = await createPool();
    await connection.beginTransaction();

    let BookingMaster = new BookingsMaster();
    let bookingId = await BookingMaster.checkIfCartExists(userId, connection);

    try {
        if (!bookingId) {
            return res.status(200).json({ Status: true, msg: "Cart is empty." });
        }

        // Check if any slots are not available for booking
        let isSlotAvailable = await BookProduct.checkIfSlotIdsIsStillAvailableForBooking(connection, bookingId);

        if (isSlotAvailable[0].length > 0) {
            // Some slots are not available, cancel the booking
            await BookingsMaster.updateStatusAndCancelMessage(connection, bookingId, 1, 'Slot not available for booking');
            await connection.commit();
            return res.status(400).json({ Status: false, msg: "Slots that you are trying to book may not be available at this moment." });
        }

        // Proceed with the booking

         // Retry logic for updateSlotAndBooking operation
         let retryCount = 0;
         let result;
         while (retryCount < MAX_RETRIES) {
             try {
                 result = await updateSlotAndBooking(connection, bookingId);
                 break; // Exit loop if successful
             } catch (error) {
                 if (error.code === 'ER_LOCK_DEADLOCK') {
                     console.log('Deadlock detected. Retrying...');
                     retryCount++;
                 } else {
                     throw error; // Rethrow error if not a deadlock
                 }
             }
         }
        
        const [cnt] = await connection.execute('select count(bookingId) as cnt from bookproduct where bookingId=?', [bookingId]);

        // Check if the booking status is cancelled by admin
        if (result.changedRows!=cnt[0].cnt) {
            await connection.rollback();    
            await BookingsMaster.updateStatusAndCancelMessage(connection, bookingId, 1, 'Error Confirming the booking order');
            return res.status(400).json({ Status: false, message: 'ORDER CANCELLED - The quantity to be booked is unavailable at the moment.' });
        }


        // console.log("TEST CODE FROM HERE", bookingId);
        // const abc="2024-02-05 00:00:00";
        // const def="2024-02-17 23:59:59";
        // let BookingMaster1 = new BookingsMaster();
        // const resu = await BookingMaster1.createADefaultBookingMasterEntry(connection, userId, abc, def);
        // console.log(res)
        // const newBookingId=resu.bookingId;
        // Step 1: Create a temporary table
        // const r1 = await executeQuery(`
        //     CREATE TEMPORARY TABLE TempBookProduct (
        //     productId INT,
        //     quantity INT,
        //     slotId INT,
        //     bookingId INT,
        //     bookingDate DATE,
        //     slotFromDateTime DATETIME,
        //     slotToDateTime DATETIME,
        //     price FLOAT
        //     )
        //     `);
        //     // console.log(r1)
            
        //     // Step 2: Insert data into the temporary table
        //     const r2 = await executeQuery(`
        //     INSERT INTO TempBookProduct
        //     SELECT productId, quantity, slotId,  bookingId, bookingDate, slotFromDateTime, slotToDateTime, price
        //     FROM bookProduct
        //     WHERE bookingId = ${bookingId}
        //     `);
        //     // console.log(r2);
            
        //     // Step 3: Insert the selected data into the bookProduct table with the new bookingId
        //     const r3 = await executeQuery(`
        //     INSERT INTO bookProduct (productId, quantity, slotId, bookingId, bookingDate, slotFromDateTime, slotToDateTime, price)
        //     SELECT productId, quantity, slotId, ${newBookingId} , bookingDate, slotFromDateTime, slotToDateTime, price
        //     FROM TempBookProduct
        //     `);
        //     // console.log(r3);
            
        //     const r4  = await executeQuery('DROP TEMPORARY TABLE TempBookProduct;')
        //     // console.log(r4);
            // ----------------------------------------------------
            // await BookingsMaster.updateStatusAndCancelMessage(connection, bookingId, 3);
        


        // ----------------------------------------------------
        
        await connection.execute(`
            update bookingsmaster set statusId = 3, timestamp = NOW() where bookingId = ?
        ` , [bookingId])

        await connection.commit();

        return res.status(200).json({ Status: true, message: `Order Placed Successfully. Booking Id : ${bookingId}` });
        
    } catch (err) {

        await connection.rollback();
        // await BookingsMaster.updateStatusAndCancelMessage(connection, bookingId, 6, 'Error Confirming the booking order');
        return res.status(400).json({ Status: false, message: `Error Confirming the booking order: ${err}` });
    } finally {
        connection.release();
    }
}

// Cancel Booking by user and admin
exports.cancelBooking = async (req, res) => {
    // get userId from headers & fetch the role from that token 
    const { userId, roleId, bookingId, cancel_message } = req.body;

    // Role id is assumed to be 1 : Admin -- 2 : Users

    // if user cancels : status : CANCELLED (5) 
    // if admin cancels : staus : CANCELLED BY ADMIN(6) with cancel msg 
    try {
        // Fetch the current booking status -- check if it is already cancelled
        let currStatus = await BookingStatuses.getCurrentBookingStatus(bookingId);

        if (currStatus[0].statusName == 'Cancelled by Admin') {
            return res.status(400).json({ Status: false, msg: `Booking with id ${bookingId} is already Cancelled.` });
        }

        if (roleId == 1 /**Admin */) {
            await cancelBookingByAdmin(bookingId, cancel_message);
        } else if (roleId == 2 /**User */) {
            await cancelBookingByUser(bookingId);
        }

        // Update slot booked and set slotActive if necessary
        await decrementSlotBookedCapacity(bookingId);

        res.status(200).json({ Status: true, msg: `Booking with Id ${bookingId} cancelled successfully` });
    } catch (err) {
        console.log(err);
        res.status(400).json({ Status: false, msg: `Error cancelling the Booking`, err: err.message });
    }
};
const updateSlotAndBooking = async (connection, bookingId) => {
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


// Function to cancel booking by admin
const cancelBookingByAdmin = async (bookingId, cancelMessage) => {
    await BookingsMaster.updateStatusAndCancelMessage(null, bookingId, 6, cancelMessage);
};

// Function to cancel booking by user
const cancelBookingByUser = async (bookingId) => {
    await BookingsMaster.updateStatusAndCancelMessage(null, bookingId, 5, null);
};

// Function to decrement slot booked capacity
const decrementSlotBookedCapacity = async (bookingId) => {
    const decrementTheSlotBookedCapacityQuery = `
        UPDATE slotmaster AS sm
        JOIN bookproduct AS bp ON sm.slotId = bp.slotId
        SET 
            sm.slotBooked = sm.slotBooked - bp.quantity,
            sm.slotActive = CASE WHEN (sm.slotBooked - bp.quantity) <= sm.slotOriginalCapacity THEN true ELSE sm.slotActive END
        WHERE bp.bookingId = ?;
    `;
    await executeQuery(decrementTheSlotBookedCapacityQuery, [bookingId]);
};
