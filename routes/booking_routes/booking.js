const express = require('express');
const router = express.Router();
const bookingStatusController = require('../../controllers/booking_controller/statusController')
const cartController = require('../../controllers/booking_controller/cartController')
const bookingController = require('../../controllers/booking_controller/bookingController')
const ordersController = require('../../controllers/booking_controller/ordersController')

// get userId from headers later
router.get('/cart/:userId' , cartController.viewCart);

/**
 * @description Add Product to cart (Either existing one or add new one) 
 * @method POST /addToCart
 */
router.post('/addToCart' , cartController.addToCart)

/**
 * @description Remove Product from cart  
 * @method POST /remove-cart
 */
router.post('/removeFromCart' , cartController.removefromCart)

/**
 * @description Place an order with the products in the cart 
 * @method POST /confirm-booking
 */
router.post('/confirmBooking' , bookingController.confirmBooking)

/**
 * @description Cancel the booking
 * @method POST /cancelBooking
 */
router.post('/cancelBooking' , bookingController.cancelBooking)

/**
 * @description View all the orders (user & admin)
 * @method GET /orders
 */

// /:userID -- will come from headers 
// Role should also come with this userId
// This is temporary 
router.get('/orders/:userId' , ordersController.viewAllOrders)

/**
 * @description Display All statuses possible
 * @method GET /booking/get-All-booking-status
 */
router.get('/getAllBookingStatus' , bookingStatusController.getAllStatus)

/**
 * @description Get status name (Pending , confirmed , completed etc) of teh current booking
 * @method GET /booking/1/current-booking-status
 */
router.get('/:bookingId/currentBookingStatus' , bookingStatusController.getCurrentBookingStatus)


module.exports = router;