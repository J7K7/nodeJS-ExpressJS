const express = require('express');
const router = express.Router();
const bookingStatusController = require('../../controllers/booking_controller/statusController')
const cartController = require('../../controllers/booking_controller/cartController')
const BookingController = require('../../controllers/booking_controller/bookingController')
const ordersController = require('../../controllers/booking_controller/ordersController');
const auth = require('../../middlewares/auth');

router.get('/cart' ,auth, cartController.viewCart);

/**
 * @description Add Product to cart (Either existing one or add new one) 
 * @method POST /booking/addToCart
 */
router.post('/addToCart' , auth, cartController.addToCart)

/**
 * @description Remove Product from cart  
 * @method POST /booking/removeFromCart
 */
router.post('/removeFromCart', auth , cartController.removefromCart)

/**
 * @description Place an order with the products in the cart 
 * @method POST /booking/confirmBooking
 */
router.post('/confirmBooking' , auth,  BookingController.confirmBooking)

/**
 * @description Cancel the booking
 * @method POST /booking/cancelBooking
 */
router.post('/cancelBooking' , auth,  BookingController.cancelBooking)

/**
 * @description View all the orders (user & admin)
 * @method GET /orders
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