const { executeQuery } = require("../../db/connection");

class Order {
    constructor(bookingId, bookingDate, booking_fromDatetime, booking_toDatetime, status, grandTotal) {
        this.bookingId = bookingId;
        this.bookingDate = bookingDate;
        this.booking_fromDatetime = booking_fromDatetime;
        this.booking_toDatetime = booking_toDatetime;
        this.status = status;
        this.grandTotal = grandTotal;
        this.products = [];
    }

    addProduct(productId, productName, productImageId, quantity) {
        this.products.push({ productId, productName, productImageId, quantity, slots: [] });
    }

    addSlot(productId, slotId, slotFromDateTime, slotToDateTime, price) {
        const product = this.products.find(product => product.productId === productId);
        // Check if the slotId already exists, if not add the slot
        if (!product.slots.some(slot => slot.slotId === slotId)) {
            product.slots.push({ slotId, slotFromDateTime, slotToDateTime, price });
        }
    }

    static async getAllOrders(){
        let sql = `
            SELECT b.bookingId, b.bookingDate, b.booking_fromDatetime, b.booking_toDatetime, b.statusId , b.grandTotal,
                p.productId, p.quantity, s.slotId, s.slotFromDateTime, s.slotToDateTime, s.price,
                pm.productName , ip.imageId
            FROM bookingsmaster b
            JOIN bookProduct p ON b.bookingId = p.bookingId
            JOIN productmaster pm ON p.productId = pm.productId
            LEFT JOIN imageproduct_relation ip ON pm.productId = ip.productId
            LEFT JOIN bookproduct s ON p.productId = s.productId AND p.bookingId = s.bookingId;
        `;

        try{
            const res = await executeQuery(sql);
            return res;
        }catch(err){
            throw('Error executing getAllOrders query:', err);
        }
    }

    static async getAllOrdersOfUser(userId){

        let sql = `
            SELECT b.bookingId, b.bookingDate, b.booking_fromDatetime, b.booking_toDatetime, b.statusId , b.grandTotal,
                p.productId, p.quantity, s.slotId, s.slotFromDateTime, s.slotToDateTime, s.price,
                pm.productName , ip.imageId
            FROM bookingsmaster b
            JOIN bookProduct p ON b.bookingId = p.bookingId
            JOIN productmaster pm ON p.productId = pm.productId
            LEFT JOIN imageproduct_relation ip ON pm.productId = ip.productId
            LEFT JOIN bookproduct s ON p.productId = s.productId AND p.bookingId = s.bookingId
            JOIN userbooking_relation u ON b.bookingId = u.bookingId
            WHERE u.userId = ?;
        `;

        try{
            const res = await executeQuery(sql , [userId]);
            return res;
        }catch(err){
            throw('Error executing getAllOrdersOfUser query:', err);
        }

    }
}

module.exports = Order;