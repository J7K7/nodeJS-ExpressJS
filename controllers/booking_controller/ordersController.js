const Order = require('../../models/booking_model/orders')

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
exports.viewAllOrders = async (req, res) => {
    const userId = req.params.userId;

    // Hardcoded as of now, replace with roleId from the headers
    const role = 'user';
    // const role = 'user';
    let orders = {};

    try {
        let ordersData;

        if (role == 'admin') {
            ordersData = await Order.getAllOrders();
        } else {
            ordersData = await Order.getAllOrdersOfUser(userId);
        }

        ordersData.forEach(data => {
            // Check if the order already exists, if not create a new one
            if (!orders[data.bookingId]) {
                orders[data.bookingId] = new Order(
                    data.bookingId,
                    data.bookingDate,
                    data.booking_fromDatetime,
                    data.booking_toDatetime,
                    data.statusId,
                    data.grandTotal
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
                    data.quantity
                );
            }

            // Add slot details to the product
            orders[data.bookingId].addSlot(
                data.productId,
                data.slotId,
                data.slotFromDateTime,
                data.slotToDateTime,
                data.price
            );
        });

        res.status(200).json({ Status: true, msg: "Orders Displayed Successfully", totalBookings: Object.keys(orders).length, bookings: orders });
    } catch (err) {
        res.status(400).json({ Status: false, msg: "Error Viewing Orders. Try Again !", err : err.message});
    }
};
