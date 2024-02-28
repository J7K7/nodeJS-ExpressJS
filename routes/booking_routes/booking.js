const express = require('express');
const router = express.Router();
const bookingStatusController = require('../../controllers/booking_controller/statusController')
const cartController = require('../../controllers/booking_controller/cartController')
const BookingController = require('../../controllers/booking_controller/bookingController')
const ordersController = require('../../controllers/booking_controller/ordersController');
const auth = require('../../middlewares/auth');

/**
 * @description View cart
 * @method POST /booking/cart
 */
router.get('/cart' ,auth, cartController.viewCart);

/**
 * @description Add Product to cart (Either existing one or add new one) 
 * @method POST /booking/addToCart
 * @input Requires the request body to be URL encoded
 *          1) Slot 
 *              - bookingCategoryId : 1
 *              - bookingFromDate (YYYY-MM-DD)
 *              - slotIds : [] (Array of one slot Id selected)
 *              - productId
 *              - quantity
 *          2) Day 
 *              - bookingCategoryId : 2
 *              - bookingFromDate (YYYY-MM-DD)
 *              - bookingToDate (YYYY-MM-DD)
 *              - productId
 *              - quantity
 */
router.post('/addToCart' , auth, cartController.addToCart)

/**
 * @description Remove Product from cart  
 * @method POST /booking/removeFromCart
 * @input Requires the request body to be URL encoded
 *          - productId 
 *          - slotId
 */
router.post('/removeFromCart', auth , cartController.removefromCart)

/**
 * @description Place an order with the products in the cart 
 * @method POST /booking/confirmBooking
 * @input Requires the request body to be URL encoded
 */
router.post('/confirmBooking' , auth,  BookingController.confirmBooking)

/**
 * @description Cancel the booking
 * @method POST /booking/cancelBooking
 * @input Requires the request body to be URL encoded
 *           1) Cancel By User 
 *                  - roleId : 2
 *                  - bookingId 
 *   
 *           2) Cancel By Admin
 *                  - roleId : 1
 *                  - bookingId
 *                  - cancel_message
 */
router.post('/cancelBooking' , auth,  BookingController.cancelBooking)

/**
 * @description View all the orders (user & admin)
 * @method GET /orders
 * @input Requires the request body to be URL encoded (gets the roleId from the headers & processes accordingly)
 *            1) View all the orders (ADMIN)
 *            2) View all the orders of the user (USER)
 */
router.get('/orders' , auth,  ordersController.viewAllOrders)

/**
 * @description Display All statuses possible
 * @method GET /booking/getAllBookingStatus
 */
router.get('/getAllBookingStatus' , bookingStatusController.getAllStatus)

/**
 * @description Get status name (Pending , confirmed , completed etc) of teh current booking
 * @method GET /booking/1/currentBookingStatus
 */
router.get('/:bookingId/currentBookingStatus' , bookingStatusController.getCurrentBookingStatus)


module.exports = router;