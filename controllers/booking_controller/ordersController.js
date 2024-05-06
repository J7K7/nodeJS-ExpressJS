const Order = require('../../models/booking_model/orders')
const moment = require("moment");

// orders Data general structure 
// orders : {
//     bookingId(eg : 1) : {
// ----- bookng details 
//         bookingDate : 
//         booking_from Date : (for both slot & day )
//         booking to Date : (only for Day)\
//         products : [
//                 productId
//                 quantity
//                     slots : [
//                             Slotid
//                             SlotFromDateTime
//                             SlotToDateTime
//                             price
//                         }
//                     ]
//         grandTotal
//     ] , 
//     bookingId (eg : 2) : {
//         Same 
//     }
// }


// /*
//     If normal User : Find the orders of the particular user 
//     If Admin : Find all the orders 
// */

const ordersController = {
    viewAllOrders: async (req, res) => {

        const userId = req.user.userId;
        const roleId = req.user.roleId;
        let statusId = req.query.statusId;

        /**Send 0 statusId for ALL -- that is displaying ALL the orders with all the posisbel statuses */
        // If statusId is not provided or null, set it to 0
        statusId = statusId ? parseInt(statusId) : 0;


        // console.log("statusId : ");
        // console.log(statusId);

        if(statusId < 0 || statusId > 6 ){
            return res.status(400).json({ Status: false, msg: "Error Viewing Orders. Try Again !", err: 'Kindly provide a valid Status.' });
        }
        // const role = 'user';
        let orders = {};

        try {
            let ordersData;

            if (roleId == 1) {
                ordersData = await Order.getAllOrders();
            } else if (roleId == 2) {
                ordersData = await Order.getAllOrdersOfUser(userId , statusId);
            }
            
            // console.log("Orders Data : ");
            // console.log(ordersData);
      

            ordersData.forEach(data => {
                // Check if the order already exists, if not create a new one
                if (!orders[data.bookingId]) {
                    // console.log(data.timestamp);
                    orders[data.bookingId] = new Order(
                        data.bookingId,
                        data.bookingDate,
                        data.booking_fromDatetime,
                        data.booking_toDatetime,
                        data.statusId,
                        data.grandTotal,
                        data.timestamp,
                        {
                            userId: data.userId,
                            email: data.email,
                            firstName: data.firstName,
                            lastName: data.lastName,
                            phoneNumber: data.phoneNumber
                        }
                    );
                }

                // Check if the product already exists in the order
                let product = orders[data.bookingId].products.find(prod => prod.productId === data.productId);

                // if not create a new one
                if (!product) {
                    orders[data.bookingId].addProduct(
                        data.productId,
                        data.productName,
                        data.imageId,
                        data.productImagePath,
                        data.quantity
                    );
                }

                // Add slot details to the product
                orders[data.bookingId].addSlot(
                    data.productId,
                    data.slotId,
                    data.slotFromDateTime,
                    data.slotToDateTime,
                    data.price,
                    data.quantity
                );
            });


            Object.values(orders).forEach(order => {
                order.bookingDate = moment(order.bookingDate).format(
                    "YYYY-MM-DD HH:mm:ss"
                );
                order.booking_fromDatetime = moment(order.booking_fromDatetime).format(
                    "YYYY-MM-DD HH:mm:ss"
                );
                order.booking_toDatetime = moment(order.booking_toDatetime).format(
                    "YYYY-MM-DD HH:mm:ss"
                );
                order.timestamp = moment(order.timestamp).format(
                    "YYYY-MM-DD HH:mm:ss"
                );
                order.products.forEach(product => {
                    product.slots.forEach(slot => {
                        slot.slotFromDateTime = moment(slot.slotFromDateTime).format(
                            "YYYY-MM-DD HH:mm:ss"
                        );
                        slot.slotToDateTime = moment(slot.slotToDateTime).format(
                            "YYYY-MM-DD HH:mm:ss"
                        );
                    });
                });
            });

            // console.log("Final Orders : ")
            // console.log(orders)

            return res.status(200).json({ Status: true, msg: "Orders Displayed Successfully", totalBookings: Object.keys(orders).length, bookings: orders });
        } catch (err) {
            return res.status(400).json({ Status: false, msg: "Error Viewing Orders. Try Again !", err: err.message });
        }
    }
}


module.exports = ordersController;
