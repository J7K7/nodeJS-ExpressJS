const { createPool } = require('../../db/connection');

const BookingsMaster = require('../../models/booking_model/bookingsMaster')
const BookProduct = require('../../models/booking_model/bookProduct')
const Slot = require('../../models/product_model/slot')
const moment = require('moment');

// Create the cart or update the existing one
// Add new product with default quantity 1 in teh cart
// Add same product multiple time to increase the quantity automatically
// Increase teh quanity of existing product in teh cart 

// Process : 
// For a particular user - one cart exist at a time - so check if teh cart exists - if not create a new one (userbooking_reation table)
// When creating teh cart for the first time - we generate a bookingId & set the status to added to cart(Bookingsmaster table) 

// While adding products - we check if the product already exist - if yes - replace the existing one with some modified quanity - else add the product with default quantity 1 in the cart - (BOOKPRODUCT table)
// Fetch the slot data with the selected slotIds (Slotmaster table)
// update teh price according teh the quantity in the bookproduct & update teh grandTotal at last 

// Reason for transaction in cart : when mtuliple users adds products to cart at the same tiemm  - without the idnividual connection Then all users add the product to same cart -- which is a problem 
// Cart shoudl be independent for each user - hence maintaining the isolation of all with the transaction ----- 

exports.addToCart = async (req, res) => {

    const userId = req.user.userId;

    // Start a transaction
    const connection = await createPool();
    await connection.beginTransaction();

    try {

        // Get userId from teh headers later
        let { bookingCategoryId, bookingFromDate, bookingToDate = null, productId, quantity } = req.body;

        // Parsing the incoming data bcoz the www-urlencoded type of data gets passed as string in the body
        productId = parseInt(productId);
        quantity = parseInt(quantity);

        // if day -- multiple slotIds -- If slot -- one slot Id 
        let slotIds;
        let slot = new Slot();

        // If slotIds is null in body-- which mean booking category is Day -- find slot Ids automatically 
        if (bookingCategoryId == 1 /**Slot */) {

            slotIds = JSON.parse(req.body.slotIds);

        } else if (bookingCategoryId == 2/**Day */) {
            // Find SLot Ids based on booking from date & booking to date (Bcoz slots are of complete dayss)
             bookingFromDate = moment(bookingFromDate).format('YYYY-MM-DD');
             bookingToDate = moment(bookingToDate).format('YYYY-MM-DD');

            const numberofDays = moment(bookingToDate).diff(moment(bookingFromDate), 'days') + 1

            // console.log(numberofDays);
            let slotIdsTemp = await slot.findSlotIds(connection, productId, bookingFromDate, bookingToDate);
            slotIds = slotIdsTemp.map((slot) => slot.slotId);
            // console.log(slotIds)
            // Some of the days may not be available between bookingFromDateTime & bookingToDateTime 
            // Cases : a day between the fromDate & toDate can be deactivated by the admin - or deleted - or capacity full 
            if (slotIds.length != numberofDays) {
                throw new Error('Booking not available between this dates.')
            }
        }

        if (slotIds.length == 0) {
            throw new Error('Slots Unavailable Or product Is Inactive!')
        }

        // If cart exist : return current bookingId
        // else return null(indicating you need to generate the bookingId to add products to cart)
        let BookingMaster = new BookingsMaster();
        let currentBookingId = await BookingMaster.checkIfCartExists(userId, connection);

        // Date Format: YYYY-MM-DD
        // The day the product is booked : Date.now() : Will get updated with the date fo the latest product that is added to cart 
        let currentBookingDate = moment().format('YYYY-MM-DD');
        let currentbooking_fromDatetime;
        let currentbooking_toDatetime;

        if (currentBookingId == null) {
            // Meaning -- cart does not exist -- bookingId does not exist -- hence create one
            const { bookingId, bookingDate , booking_fromDatetime , booking_toDatetime} = await BookingMaster.createADefaultBookingMasterEntry(connection, userId, bookingFromDate , bookingToDate , slotIds , bookingCategoryId);

            currentBookingId = bookingId;
            currentBookingDate = bookingDate;
            currentbooking_fromDatetime = booking_fromDatetime;
            currentbooking_toDatetime = booking_toDatetime;

        }else{

            ({ currentbooking_fromDatetime , currentbooking_toDatetime} = await getBookingDates(currentBookingId , connection))
            
        }

        currentbooking_fromDatetime = moment(currentbooking_fromDatetime).format('YYYY-MM-DD HH:mm:ss');
        currentbooking_toDatetime = moment(currentbooking_toDatetime).format('YYYY-MM-DD HH:mm:ss');
    
        // this dates are validated so taht next time the user adds another product it should match the criteria of existing dates 
        await BookingMaster.validateBookingDates(bookingCategoryId , bookingFromDate , currentBookingId, currentbooking_fromDatetime , currentbooking_toDatetime , connection);

        // Cart is now created with some currentBookingId -- add products to cart 

        const {updatedbooking_fromDatetime , updatedbooking_toDatetime} = await processSlotIds(slotIds, productId, quantity, currentBookingId, currentbooking_fromDatetime , currentbooking_toDatetime ,connection);

        
        // Update grand total of the Cart & dates 
        await BookingMaster.updateGrandTotalAndDates(connection, currentBookingId, updatedbooking_fromDatetime, updatedbooking_toDatetime);

        // Commit the transaction if everything is successful
        await connection.commit();

        return res.status(200).json({ Status: true, msg: "Cart Updated Successfully" })
    } catch (err) {
        console.log(err)
        // Rollback the transaction in case of an error
        await connection.rollback();
        return res.status(400).json({ Status: false, msg: "Error Adding Product to Cart. Try Again !", err: err.message })
    } finally {
        // Release the connection
        connection.release();
    }
}


// if curr quantity of teh item to be removed from cart is 1 - delete the entry from bookproduct - bookingsmaster & userBooking_relation tables 
exports.removefromCart = async (req, res) => {
    // Start a transaction
    const connection = await createPool();
    await connection.beginTransaction();

    const userId = req.user.userId;

    try {
        const {productId, slotId } = req.body;

        let BookingMaster = new BookingsMaster();
        let currentBookingId = await BookingMaster.checkIfCartExists(userId, connection);

        if (currentBookingId == null) {
            return res.status(400).json({ Status: false, msg: "Cart is empty" });
        }

        let BookProducts = new BookProduct();
        const { itemExists, currentQuantity } = await BookProducts.checkItemInCart(currentBookingId, productId, slotId, connection);

        if (!itemExists) {
            return res.status(404).json({ Status: false, msg: "Item not found in the cart" });
        }

        // Removes the product details from the book product 
        await BookProducts.removeCartItem(currentQuantity, connection, currentBookingId, productId, slotId);

        // Delete the cart entry from bookingsmaster if all the items are removed from cart 
        await BookingMaster.deleteCartEntryIfEmpty(currentBookingId, connection);

        // Commit the transaction if everything is successful
        await connection.commit();

        return res.status(200).json({ Status: true, msg: "Item removed from cart Successfully" });
    } catch (err) {
        // Rollback the transaction in case of an error
        await connection.rollback();
        return res.status(400).json({ Status: false, msg: "Error Removing Item from Cart. Try Again!", err: err.message });
    } finally {
        // Release the connection
        connection.release();
    }
};

// View all items in the cart
exports.viewCart = async (req, res) => {

    // Get it from heaaders later
    // const userId = req.params.userId;

    const userId = req.user.userId;


    const BookingMaster = new BookingsMaster();
    try {

        let currentBookingId = await BookingMaster.checkIfCartExists(userId, null);

        console.log("currentBookingId" , currentBookingId)
        // Check if the cart exists
        if (currentBookingId == null) {
            return res.status(200).json({ Status: true, msg: "Cart is empty", items: [] });
        }

        // Fetch all items in the cart
        const cartItems = await BookingMaster.getCartItems(currentBookingId);

        return res.status(200).json({ Status: true, msg: "Cart items retrieved successfully", items: cartItems });
    } catch (err) {
        return res.status(400).json({ Status: false, msg: "Error retrieving cart items. Try again!", err: err.message });
    }
};

// async function findSlotIds(connection, productId, bookingFromDate, bookingToDate) {
//     try {
//         // Applicable for Day based booking 
//         // If Business Category = Day -- Find the slots based on  booking_fromDatetime, booking_toDatetime

//         let q = `
//         SELECT slotId 
//         FROM slotmaster 
//         WHERE slotDate >= '${bookingFromDate}' 
//             AND slotDate <= '${bookingToDate}'
//             AND slotId IN (
//                 SELECT slotId 
//                 FROM slotproduct_relation 
//                 WHERE productId = '${productId}'
//             )
//             AND '${productId}' NOT IN (
//                 SELECT productId
//                 FROM productmaster
//                 WHERE isDeleted = 1 or isActive=0
//             );

//         `

//         const slotIds = await connection.execute(q, [bookingFromDate, bookingToDate, productId]);

//         return slotIds[0];
//     } catch (err) {
//         throw new Error("Error fetching the slots for this product: " + err.message);
//     }
// }


async function processSlotIds(slotIds, productId, quantity, currentBookingId, currentbooking_fromDatetime , currentbooking_toDatetime , connection) {
    // Process slot IDs and update cart
    let updatedbooking_fromDatetime;
    let  updatedbooking_toDatetime;

    for (const slotId of slotIds) {
        ({updatedbooking_fromDatetime , updatedbooking_toDatetime} = await processSlot(slotId, productId, quantity, currentBookingId, currentbooking_fromDatetime , currentbooking_toDatetime  , connection));
    }   

    return {updatedbooking_fromDatetime , updatedbooking_toDatetime};
}

async function processSlot(slotId, productId, quantity, currentBookingId, currentbooking_fromDatetime , currentbooking_toDatetime , connection) {

    let BookProducts = new BookProduct();

    // Process individual slot and update cart
    const slotDetails = await validateSlot(slotId, quantity, connection);

    // Update the dates of the slot if needed in bookingsmaster
    let {updatedbooking_fromDatetime , updatedbooking_toDatetime} = await updateBookingDates(slotDetails , currentBookingId , currentbooking_fromDatetime , currentbooking_toDatetime , connection );

    const existingProductDetails = await BookProducts.getExistingProductDetails(currentBookingId, productId, slotId, connection);

    if (existingProductDetails[0].length != 0) {
        await BookProducts.updateProductQuantity(quantity, slotId, productId, currentBookingId, connection);
    } else {

        let BookProducts = new BookProduct();
        await BookProducts.createBookingProductEntry(connection, productId, quantity, slotId, currentBookingId, slotDetails.slotFromDateTime);
    }

    return {updatedbooking_fromDatetime , updatedbooking_toDatetime};
}

async function updateBookingDates(slotDetails , currentBookingId , currentbooking_fromDatetime , currentbooking_toDatetime , connection ){


    if(moment(slotDetails.slotFromDateTime).isBefore(currentbooking_fromDatetime)){
        currentbooking_fromDatetime = slotDetails.slotFromDateTime
    }

    if(moment(slotDetails.slotToDateTime).isAfter(currentbooking_toDatetime)){
        currentbooking_toDatetime = slotDetails.slotToDateTime;
    }

    let sql = `
        update bookingsmaster 
        set booking_fromDatetime = ?, booking_toDatetime = ? where bookingId = ?
    `

    await connection.execute(sql , [currentbooking_fromDatetime , currentbooking_toDatetime , currentBookingId])

    return {updatedbooking_fromDatetime : currentbooking_fromDatetime , updatedbooking_toDatetime : currentbooking_toDatetime}
}


async function validateSlot(slotId, quantity, connection) {
    // Validate slot details
    quantity = parseInt(quantity);
    console.log("slotId" , slotId)
    const slotDetails = await Slot.getSlotById(slotId, connection);
    // console.log("slotDetails" ,slotDetails);
    if (!slotDetails.slotActive) {
        throw new Error(`Slot with id ${slotId} is inactive!`);
    }

    if (slotDetails.slotBooked + quantity > slotDetails.slotOriginalCapacity) {
        throw new Error(`Available Slot capacity for ${slotId}: ${slotDetails.slotOriginalCapacity - slotDetails.slotBooked}`);
    }
    return slotDetails;
}


// async function getSlotDetails(slotId, connection) {
//     // Get details of a slot
//     const sql = `SELECT slotFromDateTime, slotToDateTime, slotBooked, slotPrice, slotActive, slotOriginalCapacity FROM slotmaster WHERE slotId = ?`;
//     const [result] = await connection.execute(sql, [slotId]);

//     return result[0];
// }

async function getBookingDates(bookingId, connection) {
    const sql = `
        select booking_fromDatetime , booking_toDatetime from bookingsmaster where bookingId = ?;
    `

    const [result] = await connection.execute(sql, [bookingId]);

    return { currentbooking_fromDatetime : result[0].booking_fromDatetime, currentbooking_toDatetime : result[0].booking_toDatetime};
}








